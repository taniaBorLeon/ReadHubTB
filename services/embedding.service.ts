import "server-only";

import { generateEmbeddings } from "@/lib/ai/embeddings";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ARTICLES_BUCKET } from "@/lib/constants/storage";
import {
  CHUNK_MAX_CHARS,
  CHUNK_OVERLAP_CHARS,
  EMBEDDING_DIMENSIONS,
} from "@/lib/constants/ai";

async function extractTextFromDocument(
  buffer: Buffer,
  documentPath: string,
): Promise<string> {
  const lowerPath = documentPath.toLowerCase();

  if (lowerPath.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  if (lowerPath.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (lowerPath.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  throw new Error(`Formato de documento no soportado: ${documentPath}`);
}

/**
 * El título y el resumen se anteponen a cada fragmento del contenido (no
 * solo al primero) para que, cuando la búsqueda semántica devuelva un chunk
 * aislado, siga siendo identificable a qué artículo pertenece y conserve
 * el contexto editorial que ayuda a que el embedding capture mejor el tema.
 */
function composeChunkText(
  title: string,
  summary: string | null,
  contentChunk: string,
): string {
  const parts = [`Título: ${title}`];
  if (summary) {
    parts.push(`Resumen: ${summary}`);
  }
  parts.push(`Contenido:\n${contentChunk}`);
  return parts.join("\n\n");
}

function chunkText(
  content: string,
  maxChars: number = CHUNK_MAX_CHARS,
  overlapChars: number = CHUNK_OVERLAP_CHARS,
): string[] {
  const trimmed = content.trim();
  if (trimmed.length <= maxChars) {
    return trimmed.length > 0 ? [trimmed] : [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < trimmed.length) {
    let end = Math.min(start + maxChars, trimmed.length);

    if (end < trimmed.length) {
      const lastSpace = trimmed.lastIndexOf(" ", end);
      if (lastSpace > start) {
        end = lastSpace;
      }
    }

    chunks.push(trimmed.slice(start, end).trim());

    if (end >= trimmed.length) break;
    start = end - overlapChars;
    if (start < 0) start = end;
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface GenerateArticleEmbeddingsResult {
  articleId: string;
  chunksStored: number;
}

/**
 * Genera y persiste los embeddings de un artículo. Reemplaza siempre los
 * chunks previos del mismo artículo (delete + insert) para que pueda
 * volver a ejecutarse de forma segura -- ya sea manualmente ahora, o desde
 * un trigger automático de creación/edición en una fase posterior -- sin
 * acumular filas duplicadas.
 */
export async function generateArticleEmbeddings(
  articleId: string,
): Promise<GenerateArticleEmbeddingsResult> {
  const supabase = createServiceRoleClient();

  const { data: article, error: articleError } = await supabase
    .from("articles")
    .select("id, title, summary, document_path")
    .eq("id", articleId)
    .single();

  if (articleError) throw articleError;
  if (!article) throw new Error(`Artículo no encontrado: ${articleId}`);
  if (!article.document_path) {
    throw new Error(`El artículo ${articleId} no tiene documento asociado.`);
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from(ARTICLES_BUCKET)
    .download(article.document_path);

  if (downloadError) throw downloadError;

  const buffer = Buffer.from(await file.arrayBuffer());
  const extractedText = await extractTextFromDocument(
    buffer,
    article.document_path,
  );

  const contentChunks = chunkText(extractedText);
  if (contentChunks.length === 0) {
    throw new Error(
      `El documento del artículo ${articleId} no contiene texto extraíble.`,
    );
  }

  const composedChunks = contentChunks.map((contentChunk) =>
    composeChunkText(article.title, article.summary, contentChunk),
  );

  // Una sola petición para todos los chunks del artículo (en vez de una por
  // chunk): menos overhead de red y evita disparar N llamadas simultáneas al
  // proveedor de embeddings, que es lo que realmente puede gatillar rate
  // limits en artículos con muchos fragmentos.
  const embeddings = await generateEmbeddings(composedChunks);

  const rows = composedChunks.map((composedText, chunkIndex) => {
    const embedding = embeddings[chunkIndex];
    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Dimensión de embedding inválida para el chunk ${chunkIndex} del artículo ${articleId}.`,
      );
    }

    return {
      article_id: articleId,
      chunk_index: chunkIndex,
      content: composedText,
      token_count: estimateTokenCount(composedText),
      embedding,
    };
  });

  const { error: deleteError } = await supabase
    .from("article_chunks")
    .delete()
    .eq("article_id", articleId);

  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from("article_chunks")
    .insert(rows);

  if (insertError) throw insertError;

  return { articleId, chunksStored: rows.length };
}
