import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@readhub/database/types";
import { getArticleWithStats } from "@readhub/database/queries/articles";
import { getArticleFullContent } from "@readhub/database/queries/chunks";

export interface ArticleForAnalysis {
  id: string;
  title: string;
  summary: string | null;
  content: string;
}

/**
 * Reúne metadata (getArticleWithStats) y contenido completo indexado
 * (getArticleFullContent, reconstruido a partir de article_chunks) para un
 * conjunto de artículos. Único punto que usan las Tools de análisis
 * avanzado para obtener el texto real sobre el que razonar -- ninguna lo
 * recompone por su cuenta.
 */
export async function fetchArticlesForAnalysis(
  supabase: SupabaseClient<Database>,
  articleIds: string[],
): Promise<ArticleForAnalysis[]> {
  const articles = await Promise.all(
    articleIds.map(async (id) => {
      const article = await getArticleWithStats(supabase, id);
      if (!article) return null;

      const content = await getArticleFullContent(supabase, id);
      return {
        id: article.id,
        title: article.title,
        summary: article.summary,
        content: content || article.summary || "",
      };
    }),
  );

  return articles.filter((article): article is ArticleForAnalysis => article !== null);
}

export function formatArticlesForPrompt(articles: ArticleForAnalysis[]): string {
  return articles
    .map(
      (article, index) =>
        `[Documento ${index + 1}: "${article.title}" (id: ${article.id})]\n${article.content}`,
    )
    .join("\n\n---\n\n");
}
