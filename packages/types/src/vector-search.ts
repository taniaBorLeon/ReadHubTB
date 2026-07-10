export interface VectorSearchOptions {
  matchCount?: number;
  minSimilarity?: number;
}

export interface VectorSearchResult {
  chunkId: string;
  articleId: string;
  articleTitle: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}
