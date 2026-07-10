export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          birth_date: string | null;
          phone: string | null;
          role: "reader" | "writer" | "admin";
          created_at: string;
        };
        Insert: {
          id: string;
          birth_date?: string | null;
          phone?: string | null;
          role?: "reader" | "writer" | "admin";
          created_at?: string;
        };
        Update: {
          id?: string;
          birth_date?: string | null;
          phone?: string | null;
          role?: "reader" | "writer" | "admin";
          created_at?: string;
        };
        Relationships: [];
      };
      articles: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          summary: string | null;
          document_path: string | null;
          image_path: string | null;
          created_at: string;
          is_public: boolean;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          summary?: string | null;
          document_path?: string | null;
          image_path?: string | null;
          created_at?: string;
          is_public?: boolean;
        };
        Update: {
          id?: string;
          author_id?: string;
          title?: string;
          summary?: string | null;
          document_path?: string | null;
          image_path?: string | null;
          created_at?: string;
          is_public?: boolean;
        };
        Relationships: [];
      };
      views: {
        Row: {
          id: string;
          article_id: string;
          user_id: string | null;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          user_id?: string | null;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          article_id?: string;
          user_id?: string | null;
          viewed_at?: string;
        };
        Relationships: [];
      };
      likes: {
        Row: {
          id: string;
          article_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          article_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          article_id: string;
          user_id: string;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          user_id: string;
          comment: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          article_id?: string;
          user_id?: string;
          comment?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      favorites: {
        Row: {
          id: string;
          article_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          article_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      article_chunks: {
        Row: {
          id: string;
          article_id: string;
          chunk_index: number;
          content: string;
          token_count: number | null;
          embedding: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          chunk_index: number;
          content: string;
          token_count?: number | null;
          embedding?: string | number[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          article_id?: string;
          chunk_index?: number;
          content?: string;
          token_count?: number | null;
          embedding?: string | number[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      list_articles_with_stats: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          author_id: string;
          author_email: string | null;
          title: string;
          summary: string | null;
          document_path: string | null;
          image_path: string | null;
          created_at: string;
          views_count: number;
          likes_count: number;
        }[];
      };
      get_article_with_stats: {
        Args: { p_article_id: string };
        Returns: {
          id: string;
          author_id: string;
          author_email: string | null;
          title: string;
          summary: string | null;
          document_path: string | null;
          image_path: string | null;
          created_at: string;
          is_public: boolean;
          views_count: number;
          likes_count: number;
          liked_by_me: boolean;
        }[];
      };
      list_comments_with_author: {
        Args: { p_article_id: string };
        Returns: {
          id: string;
          article_id: string;
          user_id: string;
          author_email: string | null;
          comment: string;
          created_at: string;
        }[];
      };
      match_article_chunks: {
        Args: {
          p_query_embedding: string | number[];
          p_match_count?: number;
          p_min_similarity?: number;
        };
        Returns: {
          chunk_id: string;
          article_id: string;
          article_title: string;
          chunk_index: number;
          content: string;
          similarity: number;
        }[];
      };
    };
  };
}
