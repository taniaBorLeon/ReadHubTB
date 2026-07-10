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
  "Genera un resumen global y cohesionado que sintetice el conjunto de documentos proporcionados como si fueran un único cuerpo de conocimiento.",
  "Evita repetir información redundante entre documentos y organiza el resumen por ideas, no documento por documento.",
  "Básate únicamente en el contenido proporcionado.",
].join(" ");

export function registerGenerateGlobalSummaryTool(server: McpServer): void {
  server.registerTool(
    "generate_global_summary",
    {
      title: "Generar resumen global",
      description:
        "Genera un resumen único y cohesionado que sintetiza varios artículos de ReadHub como un solo cuerpo de conocimiento, en vez de resumirlos por separado. Acepta ids explícitos o un tema para descubrir artículos relevantes mediante búsqueda semántica.",
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      inputSchema: {
        articleIds: z
          .string()
          .optional()
          .describe("Ids de los artículos a resumir conjuntamente, separados por coma"),
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
          1,
          SYSTEM_PROMPT,
          (found) =>
            `${formatArticlesForPrompt(found)}\n\nGenera un resumen global de los ${found.length} documentos anteriores.`,
        );

        return toToolResult({ articles, discoveryNote, summary: analysis });
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
