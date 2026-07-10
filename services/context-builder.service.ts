import "server-only";

import {
  CHUNK_OVERLAP_CHARS,
  DEFAULT_MAX_CONTEXT_CHARS,
  DEFAULT_MAX_CONTEXT_DOCUMENTS,
  DEFAULT_MIN_CHUNK_LENGTH,
  DEFAULT_MIN_SIMILARITY,
} from "@/lib/constants/ai";
import type { VectorSearchResult } from "@/types/vector-search";

export interface ContextSource {
  rank: number;
  articleId: string;
  articleTitle: string;
  chunkIds: string[];
  similarity: number;
}

export interface BuildContextOptions {
  maxDocuments?: number;
  minSimilarity?: number;
  maxContextChars?: number;
  minChunkLength?: number;
}

export interface BuildContextResult {
  systemPrompt: string;
  userPrompt: string;
  sources: ContextSource[];
  hasContext: boolean;
}

interface MergedDocument {
  articleId: string;
  articleTitle: string;
  content: string;
  similarity: number;
  chunkIds: string[];
}

function groupByArticle(
  results: VectorSearchResult[],
): Map<string, VectorSearchResult[]> {
  const groups = new Map<string, VectorSearchResult[]>();
  for (const result of results) {
    const existing = groups.get(result.articleId);
    if (existing) {
      existing.push(result);
    } else {
      groups.set(result.articleId, [result]);
    }
  }
  return groups;
}

// Los chunks de un mismo artículo se generaron con solape (CHUNK_OVERLAP_CHARS):
// si dos son contiguos, sus textos comparten un tramo final/inicial idéntico.
// Se busca ese solape exacto y se recorta antes de concatenar, en vez de
// duplicar el fragmento compartido en el contexto final.
function appendWithoutOverlap(base: string, next: string): string {
  const maxOverlap = Math.min(CHUNK_OVERLAP_CHARS * 2, base.length, next.length);
  for (let overlap = maxOverlap; overlap > 20; overlap--) {
    if (base.slice(-overlap) === next.slice(0, overlap)) {
      return base + next.slice(overlap);
    }
  }
  return `${base}\n${next}`;
}

function mergeArticleChunks(chunks: VectorSearchResult[]): MergedDocument {
  const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  let content = sorted[0].content;
  for (let i = 1; i < sorted.length; i++) {
    content = appendWithoutOverlap(content, sorted[i].content);
  }

  return {
    articleId: sorted[0].articleId,
    articleTitle: sorted[0].articleTitle,
    content,
    similarity: Math.max(...chunks.map((chunk) => chunk.similarity)),
    chunkIds: sorted.map((chunk) => chunk.chunkId),
  };
}

const SYSTEM_PROMPT = [
  "Eres el asistente de conocimiento de ReadHub.",
  "Responde ÚNICAMENTE utilizando la información provista en el CONTEXTO a continuación.",
  "Si el contexto no contiene información suficiente para responder con certeza, dilo explícitamente en vez de inventar una respuesta.",
  "Cuando uses información de una fuente, menciona el título del artículo de origen.",
].join(" ");

const NO_CONTEXT_MESSAGE =
  "No se encontró información relevante en la base de conocimiento de ReadHub para esta consulta.";

/**
 * Puente puro entre el motor de recuperación y el futuro chat.service.ts:
 * no busca nada ni llama a ningún proveedor de IA, solo transforma
 * resultados ya recuperados en un prompt estructurado y su lista de fuentes.
 */
export function buildRagContext(
  query: string,
  results: VectorSearchResult[],
  options: BuildContextOptions = {},
): BuildContextResult {
  const maxDocuments = options.maxDocuments ?? DEFAULT_MAX_CONTEXT_DOCUMENTS;
  const minSimilarity = options.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
  const maxContextChars = options.maxContextChars ?? DEFAULT_MAX_CONTEXT_CHARS;
  const minChunkLength = options.minChunkLength ?? DEFAULT_MIN_CHUNK_LENGTH;

  // 1. Selección: descarta por similitud insuficiente o contenido degenerado.
  const qualified = results.filter(
    (result) =>
      result.similarity >= minSimilarity &&
      result.content.trim().length >= minChunkLength,
  );

  // 2. Organización: agrupa por artículo y fusiona sus chunks contiguos
  // (elimina la redundancia introducida por el solape del chunking).
  const documents = Array.from(groupByArticle(qualified).values()).map(
    mergeArticleChunks,
  );

  // 3. Orden de relevancia + límite de documentos distintos.
  documents.sort((a, b) => b.similarity - a.similarity);
  const selected = documents.slice(0, maxDocuments);

  // 4. Control de tamaño: agrega documentos completos mientras quepan en el
  // presupuesto de caracteres; nunca trunca un documento a la mitad.
  const included: { doc: MergedDocument; rank: number }[] = [];
  let usedChars = 0;
  for (const doc of selected) {
    if (usedChars + doc.content.length > maxContextChars && included.length > 0) {
      continue;
    }
    included.push({ doc, rank: included.length + 1 });
    usedChars += doc.content.length;
  }

  const hasContext = included.length > 0;

  const contextSection = hasContext
    ? included
        .map(
          ({ doc, rank }) => `[Fuente ${rank}: "${doc.articleTitle}"]\n${doc.content}`,
        )
        .join("\n\n---\n\n")
    : NO_CONTEXT_MESSAGE;

  const userPrompt = [
    `CONTEXTO:\n${contextSection}`,
    `PREGUNTA DEL USUARIO:\n${query.trim()}`,
  ].join("\n\n");

  const sources: ContextSource[] = included.map(({ doc, rank }) => ({
    rank,
    articleId: doc.articleId,
    articleTitle: doc.articleTitle,
    chunkIds: doc.chunkIds,
    similarity: doc.similarity,
  }));

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    sources,
    hasContext,
  };
}
