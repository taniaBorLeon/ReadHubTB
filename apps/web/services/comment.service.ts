import { createClient } from "@readhub/database/client";
import type { CommentWithAuthor } from "@readhub/types/comment";

export async function listComments(
  articleId: string,
): Promise<CommentWithAuthor[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("list_comments_with_author", {
    p_article_id: articleId,
  });
  if (error) throw error;
  return data ?? [];
}

export async function createComment(
  articleId: string,
  userId: string,
  comment: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("comments")
    .insert({ article_id: articleId, user_id: userId, comment });
  if (error) throw error;
}
