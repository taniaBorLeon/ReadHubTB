import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type ArticleChunkRow = Pick<
  Database["public"]["Tables"]["article_chunks"]["Row"],
  "chunk_index" | "content"
>;

/**
 * Devuelve los chunks ya indexados de un artículo (los mismos que persiste
 * generateArticleEmbeddings y que consulta match_article_chunks), ordenados
 * por posición. Es la única forma de acceder al contenido completo de un
 * artículo -- la tabla `articles` solo guarda el resumen, no el cuerpo.
 */
export async function getArticleChunks(
  supabase: SupabaseClient<Database>,
  articleId: string,
): Promise<ArticleChunkRow[]> {
  const { data, error } = await supabase
    .from("article_chunks")
    .select("chunk_index, content")
    .eq("article_id", articleId)
    .order("chunk_index", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Reconstruye el contenido completo de un artículo concatenando sus chunks
 * indexados en orden. Cada chunk lleva su propio encabezado de
 * título/resumen (ver composeChunkText en embedding.service.ts), así que el
 * resultado puede repetir ese encabezado entre fragmentos -- aceptable como
 * entrada para un LLM, no se reprocesa para no duplicar esa lógica de
 * composición aquí.
 */
export async function getArticleFullContent(
  supabase: SupabaseClient<Database>,
  articleId: string,
): Promise<string> {
  const chunks = await getArticleChunks(supabase, articleId);
  return chunks.map((chunk) => chunk.content).join("\n\n");
}
