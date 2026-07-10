import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createServiceRoleClient } from "@readhub/database/service-role";
import { listArticlesWithStats } from "@readhub/database/queries/articles";

import { toResourceResult } from "../lib/resource-result.js";

/**
 * ReadHub no tiene ninguna función RPC de agregación global (solo conteos
 * por artículo dentro de `list_articles_with_stats`). Este Resource deriva
 * las estadísticas de la plataforma en memoria a partir de esas mismas filas,
 * sin duplicar ni reimplementar la consulta SQL subyacente.
 */
export function registerStatsResource(server: McpServer): void {
  server.registerResource(
    "stats",
    "readhub://stats",
    {
      title: "Estadísticas de ReadHub",
      description:
        "Estadísticas agregadas de la plataforma: total de artículos, autores, vistas y likes, promedios por artículo, y el artículo más visto y más 'likeado'. Calculadas en memoria a partir del mismo listado que usa la Tool list_articles.",
      mimeType: "application/json",
    },
    async (uri) => {
      const articles = await listArticlesWithStats(createServiceRoleClient());

      const totalArticles = articles.length;
      const totalViews = articles.reduce((sum, a) => sum + a.views_count, 0);
      const totalLikes = articles.reduce((sum, a) => sum + a.likes_count, 0);
      const totalAuthors = new Set(articles.map((a) => a.author_id)).size;

      const mostViewed = articles.reduce<(typeof articles)[number] | null>(
        (best, article) =>
          !best || article.views_count > best.views_count ? article : best,
        null,
      );
      const mostLiked = articles.reduce<(typeof articles)[number] | null>(
        (best, article) =>
          !best || article.likes_count > best.likes_count ? article : best,
        null,
      );

      return toResourceResult(uri.href, {
        totalArticles,
        totalAuthors,
        totalViews,
        totalLikes,
        averageViewsPerArticle:
          totalArticles > 0 ? totalViews / totalArticles : 0,
        averageLikesPerArticle:
          totalArticles > 0 ? totalLikes / totalArticles : 0,
        mostViewedArticle: mostViewed
          ? { id: mostViewed.id, title: mostViewed.title, views: mostViewed.views_count }
          : null,
        mostLikedArticle: mostLiked
          ? { id: mostLiked.id, title: mostLiked.title, likes: mostLiked.likes_count }
          : null,
      });
    },
  );
}
