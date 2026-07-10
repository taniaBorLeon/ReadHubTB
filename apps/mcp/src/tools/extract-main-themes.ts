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
  "Extrae los temas principales presentes en los documentos proporcionados.",
  "Para cada tema, indica su nombre, una breve descripción y en qué documento(s) aparece (usa el título del documento).",
  "Basa tu respuesta únicamente en el contenido proporcionado.",
].join(" ");

export function registerExtractMainThemesTool(server: McpServer): void {
  server.registerTool(
    "extract_main_themes",
    {
      title: "Extraer temas principales",
      description:
        "Identifica los temas y tópicos principales de uno o varios artículos de ReadHub, indicando en qué documento aparece cada uno. Acepta ids explícitos o un tema para descubrir artículos relevantes mediante búsqueda semántica. Opera sobre el contenido completo indexado (article_chunks), no solo el resumen.",
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
      inputSchema: {
        articleIds: z
          .string()
          .optional()
          .describe("Ids de los artículos a analizar, separados por coma"),
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
            `${formatArticlesForPrompt(found)}\n\nExtrae los temas principales de los ${found.length} documentos anteriores.`,
        );

        return toToolResult({ articles, discoveryNote, analysis });
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
