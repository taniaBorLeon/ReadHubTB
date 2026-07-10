import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createServiceRoleClient } from "@readhub/database/service-role";
import { listArticlesWithStats } from "@readhub/database/queries/articles";

import { toResourceResult } from "../lib/resource-result.js";

/**
 * ReadHub no tiene una tabla/consulta dedicada a "autor" (el email del autor
 * viaja embebido en cada fila de `list_articles_with_stats`). Esta agregación
 * agrupa esas filas por `author_id` -- es la única forma de construir un
 * listado de autores sin duplicar la consulta SQL existente ni inventar una
 * tabla que no existe.
 */
interface AuthorSummary {
  authorId: string;
  authorEmail: string | null;
  articleCount: number;
  totalViews: number;
  totalLikes: number;
}

function summarizeAuthors(
  articles: Awaited<ReturnType<typeof listArticlesWithStats>>,
): AuthorSummary[] {
  const byAuthor = new Map<string, AuthorSummary>();

  for (const article of articles) {
    const existing = byAuthor.get(article.author_id);
    if (existing) {
      existing.articleCount += 1;
      existing.totalViews += article.views_count;
      existing.totalLikes += article.likes_count;
    } else {
      byAuthor.set(article.author_id, {
        authorId: article.author_id,
        authorEmail: article.author_email,
        articleCount: 1,
        totalViews: article.views_count,
        totalLikes: article.likes_count,
      });
    }
  }

  return [...byAuthor.values()].sort((a, b) => b.articleCount - a.articleCount);
}

export function registerAuthorResources(server: McpServer): void {
  server.registerResource(
    "authors",
    "readhub://authors",
    {
      title: "Autores de ReadHub",
      description:
        "Listado de autores que han publicado al menos un artículo público, con el número de artículos, vistas y likes acumulados. Derivado en memoria a partir de los artículos, ya que ReadHub no tiene una tabla de autores independiente.",
      mimeType: "application/json",
    },
    async (uri) => {
      const articles = await listArticlesWithStats(createServiceRoleClient());
      return toResourceResult(uri.href, summarizeAuthors(articles));
    },
  );

  server.registerResource(
    "author",
    // Sin callback `list`: el catálogo de autores ya está cubierto por el
    // resource estático `readhub://authors`; este template solo resuelve
    // lecturas directas por id ya conocido (evita duplicar la agregación en
    // cada `resources/list`).
    new ResourceTemplate("readhub://authors/{authorId}", { list: undefined }),
    {
      title: "Detalle de autor",
      description:
        "Resumen de un autor concreto (email, artículos, vistas y likes acumulados) junto con el listado de sus artículos.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const authorId = String(variables.authorId);
      const articles = await listArticlesWithStats(createServiceRoleClient());
      const authorArticles = articles.filter(
        (article) => article.author_id === authorId,
      );

      if (authorArticles.length === 0) {
        throw new Error(`No existe ningún autor con id "${authorId}".`);
      }

      const [summary] = summarizeAuthors(authorArticles);
      return toResourceResult(uri.href, { ...summary, articles: authorArticles });
    },
  );
}
