import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createServiceRoleClient } from "@readhub/database/service-role";
import { listArticlesWithStats } from "@readhub/database/queries/articles";

import { toErrorResult, toToolResult } from "../lib/tool-result.js";

export function registerListArticlesTool(server: McpServer): void {
  server.registerTool(
    "list_articles",
    {
      title: "Listar artículos",
      description:
        "Devuelve todos los artículos públicos de ReadHub (título, resumen, autor, fecha, vistas y likes), ordenados por fecha de publicación descendente. Reutiliza la misma consulta que usa la página principal de la web.",
      inputSchema: {},
    },
    async () => {
      try {
        const articles = await listArticlesWithStats(
          createServiceRoleClient(),
        );
        return toToolResult(articles);
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
