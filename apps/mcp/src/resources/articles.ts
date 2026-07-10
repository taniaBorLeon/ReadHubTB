import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createServiceRoleClient } from "@readhub/database/service-role";
import {
  getArticleWithStats,
  listArticlesWithStats,
} from "@readhub/database/queries/articles";

import { toResourceResult } from "../lib/resource-result.js";

/**
 * Expone el catálogo de artículos públicos de ReadHub como Resources:
 * - `readhub://articles` -- listado completo (mismos datos que la Tool
 *   `list_articles` y la página principal de la web).
 * - `readhub://articles/{articleId}` -- detalle de un artículo concreto
 *   (mismos datos que la Tool `get_article` y la vista de detalle de la web).
 *
 * Reutiliza exactamente `listArticlesWithStats`/`getArticleWithStats` de
 * `@readhub/database`; no reimplementa ninguna consulta.
 */
export function registerArticleResources(server: McpServer): void {
  server.registerResource(
    "articles",
    "readhub://articles",
    {
      title: "Artículos de ReadHub",
      description:
        "Listado de todos los artículos públicos (título, resumen, autor, fecha, vistas y likes), ordenados por fecha de publicación descendente.",
      mimeType: "application/json",
    },
    async (uri) => {
      const articles = await listArticlesWithStats(createServiceRoleClient());
      return toResourceResult(uri.href, articles);
    },
  );

  server.registerResource(
    "article",
    // Sin callback `list`: enumerar cada artículo como resource individual
    // exigiría consultar Supabase en cada `resources/list`, además de
    // duplicar lo que ya expone el resource estático `readhub://articles`
    // (que sirve como catálogo para descubrir los ids). Este template solo
    // resuelve lecturas directas por id ya conocido.
    new ResourceTemplate("readhub://articles/{articleId}", { list: undefined }),
    {
      title: "Detalle de artículo",
      description:
        "Detalle completo de un artículo de ReadHub (contenido, autor, fecha, vistas, likes) a partir de su identificador.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const articleId = String(variables.articleId);
      const article = await getArticleWithStats(
        createServiceRoleClient(),
        articleId,
      );
      if (!article) {
        throw new Error(`No existe ningún artículo con id "${articleId}".`);
      }
      return toResourceResult(uri.href, article);
    },
  );
}
