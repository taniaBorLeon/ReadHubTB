import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { searchRelevantChunks } from "@readhub/ai/services/vector-search";

import {
  READ_ONLY_TOOL_ANNOTATIONS,
  toErrorResult,
  toToolResult,
} from "../lib/tool-result.js";

export function registerSemanticSearchArticlesTool(server: McpServer): void {
  server.registerTool(
    "semantic_search_articles",
    {
      title: "Búsqueda semántica de artículos",
      description:
        "Recupera los fragmentos de artículos más relevantes para una consulta en lenguaje natural, usando similitud vectorial (pgvector) sobre los embeddings ya indexados. Reutiliza exactamente el mismo motor de recuperación que usa el asistente conversacional de ReadHub -- sin generar una respuesta, solo los fragmentos y su puntuación de similitud.",
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      inputSchema: {
        query: z.string().min(1).describe("Consulta en lenguaje natural"),
        matchCount: z
          .number()
          .int()
          .positive()
          .max(20)
          .optional()
          .describe("Máximo de fragmentos a devolver (por defecto 5)"),
        minSimilarity: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Umbral mínimo de similitud coseno, 0-1 (por defecto 0.75)"),
      },
    },
    async ({ query, matchCount, minSimilarity }) => {
      try {
        const results = await searchRelevantChunks(query, {
          matchCount,
          minSimilarity,
        });
        return toToolResult(results);
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
