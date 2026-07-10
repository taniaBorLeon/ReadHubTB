import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createServiceRoleClient } from "@readhub/database/service-role";
import { getArticleWithStats } from "@readhub/database/queries/articles";

import {
  READ_ONLY_TOOL_ANNOTATIONS,
  toErrorResult,
  toToolResult,
} from "../lib/tool-result.js";

export function registerGetArticleTool(server: McpServer): void {
  server.registerTool(
    "get_article",
    {
      title: "Obtener artículo por ID",
      description:
        "Devuelve el detalle completo de un artículo (contenido, autor, fecha, vistas, likes) a partir de su identificador. Reutiliza la misma consulta que usa la vista de detalle de artículo en la web.",
      inputSchema: {
        articleId: z.string().uuid().describe("ID (UUID) del artículo"),
      },
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async ({ articleId }) => {
      try {
        const article = await getArticleWithStats(
          createServiceRoleClient(),
          articleId,
        );
        if (!article) {
          return toErrorResult(
            new Error(`No se encontró ningún artículo con id ${articleId}.`),
          );
        }
        return toToolResult(article);
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
