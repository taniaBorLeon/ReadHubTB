import "server-only";

import { generateEmbedding } from "../embeddings";
import { createServiceRoleClient } from "@readhub/database/service-role";
import {
  DEFAULT_MATCH_COUNT,
  DEFAULT_MIN_SIMILARITY,
} from "../constants";
import type {
  VectorSearchOptions,
  VectorSearchResult,
} from "@readhub/types/vector-search";

/**
 * Única responsabilidad: dada una consulta en lenguaje natural, devolver los
 * fragmentos de artículos más relevantes ya ordenados por similitud. No
 * construye contexto ni conoce a Claude -- eso vive en las capas siguientes.
 */
export async function searchRelevantChunks(
  query: string,
  options: VectorSearchOptions = {},
): Promise<VectorSearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const matchCount = options.matchCount ?? DEFAULT_MATCH_COUNT;
  const minSimilarity = options.minSimilarity ?? DEFAULT_MIN_SIMILARITY;

  const queryEmbedding = await generateEmbedding(trimmedQuery, "query");

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("match_article_chunks", {
    p_query_embedding: queryEmbedding,
    p_match_count: matchCount,
    p_min_similarity: minSimilarity,
  });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    chunkId: row.chunk_id,
    articleId: row.article_id,
    articleTitle: row.article_title,
    chunkIndex: row.chunk_index,
    content: row.content,
    similarity: row.similarity,
  }));
}
