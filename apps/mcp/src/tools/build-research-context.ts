import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { searchRelevantChunks } from "@readhub/ai/services/vector-search";
import { buildRagContext } from "@readhub/ai/services/context-builder";

import { toErrorResult, toToolResult } from "../lib/tool-result.js";

export function registerBuildResearchContextTool(server: McpServer): void {
  server.registerTool(
    "build_research_context",
    {
      title: "Construir contexto de investigación",
      description:
        "Recupera y organiza los fragmentos más relevantes de ReadHub para un tema de investigación, con sus fuentes citadas -- el mismo paso de recuperación y construcción de contexto que usa ask_readhub, pero sin generar una respuesta final. Útil para que el cliente MCP construya su propio análisis o investigación a partir de fuentes reales de ReadHub.",
      inputSchema: {
        topic: z.string().min(1).describe("Tema o pregunta de investigación"),
        matchCount: z
          .number()
          .int()
          .positive()
          .max(30)
          .optional()
          .describe("Máximo de fragmentos a recuperar antes de organizarlos (por defecto 5)"),
        minSimilarity: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Umbral mínimo de similitud coseno, 0-1 (por defecto 0.75)"),
        maxContextDocuments: z
          .number()
          .int()
          .positive()
          .max(10)
          .optional()
          .describe("Máximo de documentos distintos a incluir en el contexto final"),
      },
    },
    async ({ topic, matchCount, minSimilarity, maxContextDocuments }) => {
      try {
        const chunks = await searchRelevantChunks(topic, { matchCount, minSimilarity });
        const context = buildRagContext(topic, chunks, { maxDocuments: maxContextDocuments });

        return toToolResult({
          hasContext: context.hasContext,
          sources: context.sources,
          context: context.userPrompt,
        });
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
