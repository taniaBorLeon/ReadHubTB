export interface ChatSource {
  rank: number;
  articleId: string;
  articleTitle: string;
  similarity: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  hasContext?: boolean;
  isError?: boolean;
  createdAt: string;
}
