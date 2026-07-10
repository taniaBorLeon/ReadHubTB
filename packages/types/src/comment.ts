import type { Database } from "@readhub/database/types";

export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type CommentInsert = Database["public"]["Tables"]["comments"]["Insert"];
export type CommentUpdate = Database["public"]["Tables"]["comments"]["Update"];

export type CommentWithAuthor =
  Database["public"]["Functions"]["list_comments_with_author"]["Returns"][number];
