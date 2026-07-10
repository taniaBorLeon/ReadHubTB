import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { runContentAnalysis } from "../lib/content-analysis.js";
import { formatArticlesForPrompt } from "../lib/article-corpus.js";
import {
  READ_ONLY_TOOL_ANNOTATIONS,
  toErrorResult,
  toToolResult,
} from "../lib/tool-result.js";

const SYSTEM_PROMPT = [
  "Eres un analista de contenido de ReadHub.",
  "Compara los documentos proporcionados basándote ÚNICAMENTE en su contenido.",
  "Estructura tu respuesta en tres secciones: 'Similitudes', 'Diferencias' y 'Síntesis'.",
  "No inventes información que no esté en los documentos.",
].join(" ");

export function registerCompareAndContrastArticlesTool(server: McpServer): void {
  server.registerTool(
    "compare_and_contrast_articles",
    {
      title: "Comparar y contrastar artículos",
      description:
        "Compara dos o más artículos de ReadHub sobre su contenido completo (no solo el resumen) e identifica similitudes y diferencias concretas, con una síntesis final. Acepta ids explícitos o un tema para descubrir artículos relevantes mediante búsqueda semántica. Reutiliza el contenido indexado (article_chunks) y el generador de Claude del pipeline RAG.",
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      inputSchema: {
        articleIds: z
          .string()
          .optional()
          .describe("Ids de los artículos a comparar, separados por coma"),
        topic: z
          .string()
          .optional()
          .describe(
            "Alternativa a articleIds: tema en lenguaje natural para descubrir artículos relevantes",
          ),
      },
    },
    async ({ articleIds, topic }) => {
      try {
        const { articles, discoveryNote, analysis } = await runContentAnalysis(
          { articleIds, topic },
          2,
          SYSTEM_PROMPT,
          (found) =>
            `${formatArticlesForPrompt(found)}\n\nCompara los ${found.length} documentos anteriores.`,
        );

        return toToolResult({ articles, discoveryNote, analysis });
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
