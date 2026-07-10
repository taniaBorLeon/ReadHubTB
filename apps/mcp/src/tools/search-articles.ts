import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createServiceRoleClient } from "@readhub/database/service-role";
import { searchArticlesByKeyword } from "@readhub/database/queries/articles";

import {
  READ_ONLY_TOOL_ANNOTATIONS,
  toErrorResult,
  toToolResult,
} from "../lib/tool-result.js";

export function registerSearchArticlesTool(server: McpServer): void {
  server.registerTool(
    "search_articles",
    {
      title: "Buscar artículos por palabra clave",
      description:
        "Busca artículos públicos cuyo título o resumen contenga la palabra o frase indicada (coincidencia literal, no semántica). Para búsquedas por significado/tema usa semantic_search_articles.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Palabra o frase a buscar en título/resumen"),
      },
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async ({ query }) => {
      try {
        const results = await searchArticlesByKeyword(
          createServiceRoleClient(),
          query,
        );
        return toToolResult(results);
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
