import { createClient } from "@readhub/database/client";
import type { ArticleDetail, ArticleWithStats } from "@readhub/types/article";

export interface CreateArticleInput {
  authorId: string;
  title: string;
  summary: string | null;
  documentPath: string;
  imagePath: string;
}

export async function listArticles(): Promise<ArticleWithStats[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("list_articles_with_stats");
  if (error) throw error;
  return data ?? [];
}

export async function getArticle(
  articleId: string,
): Promise<ArticleDetail | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_article_with_stats", {
    p_article_id: articleId,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

function triggerArticleIndexing(articleId: string): void {
  fetch(`/api/articles/${articleId}/index`, { method: "POST" }).catch(
    (err) => {
      console.error(
        `[rag:index] No se pudo disparar la indexación del artículo ${articleId}`,
        err,
      );
    },
  );
}

export async function createArticle(input: CreateArticleInput) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("articles")
    .insert({
      author_id: input.authorId,
      title: input.title,
      summary: input.summary,
      document_path: input.documentPath,
      image_path: input.imagePath,
    })
    .select()
    .single();
  if (error) throw error;

  // Indexación automática: no se espera (no debe bloquear ni poder romper la
  // publicación) — cualquier fallo del pipeline de embeddings queda
  // registrado en el servidor, nunca visible para quien está publicando.
  triggerArticleIndexing(data.id);

  return data;
}

export async function registerView(
  articleId: string,
  userId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("views")
    .insert({ article_id: articleId, user_id: userId });
  if (error) throw error;
}

export async function toggleLike(
  articleId: string,
  userId: string,
): Promise<boolean> {
  const supabase = createClient();
  const { error: insertError } = await supabase
    .from("likes")
    .insert({ article_id: articleId, user_id: userId });

  if (!insertError) {
    return true;
  }

  if (insertError.code === "23505") {
    const { error: deleteError } = await supabase
      .from("likes")
      .delete()
      .eq("article_id", articleId)
      .eq("user_id", userId);
    if (deleteError) throw deleteError;
    return false;
  }

  throw insertError;
}
