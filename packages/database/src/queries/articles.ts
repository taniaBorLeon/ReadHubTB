import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../database.types";

type ArticleWithStatsRow =
  Database["public"]["Functions"]["list_articles_with_stats"]["Returns"][number];
type ArticleDetailRow =
  Database["public"]["Functions"]["get_article_with_stats"]["Returns"][number];

/**
 * Única implementación de estas dos consultas en todo el monorepo: reciben
 * el cliente Supabase como parámetro en vez de construirlo ellas mismas, así
 * que sirven tanto para el cliente de sesión del navegador (apps/web) como
 * para el cliente service-role (apps/mcp) sin duplicar el cuerpo de la
 * consulta en cada contexto de ejecución.
 */
export async function listArticlesWithStats(
  supabase: SupabaseClient<Database>,
): Promise<ArticleWithStatsRow[]> {
  const { data, error } = await supabase.rpc("list_articles_with_stats");
  if (error) throw error;
  return data ?? [];
}

export async function getArticleWithStats(
  supabase: SupabaseClient<Database>,
  articleId: string,
): Promise<ArticleDetailRow | null> {
  const { data, error } = await supabase.rpc("get_article_with_stats", {
    p_article_id: articleId,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

/**
 * Búsqueda por palabra clave (no semántica) sobre título/resumen. No existía
 * ninguna función SQL de búsqueda por texto -- se compone sobre
 * listArticlesWithStats en vez de reimplementar el acceso a datos, y el
 * filtrado en memoria es lo único genuinamente nuevo de este archivo.
 */
export async function searchArticlesByKeyword(
  supabase: SupabaseClient<Database>,
  query: string,
): Promise<ArticleWithStatsRow[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const articles = await listArticlesWithStats(supabase);
  return articles.filter(
    (article) =>
      article.title.toLowerCase().includes(normalizedQuery) ||
      article.summary?.toLowerCase().includes(normalizedQuery),
  );
}
