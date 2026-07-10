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
  "Identifica relaciones entre los documentos proporcionados: por ejemplo, uno complementa a otro, uno amplía un tema que otro solo menciona, uno contradice a otro, o existe una dependencia conceptual entre ellos.",
  "Para cada relación relevante que encuentres, indica los documentos implicados (por título), el tipo de relación y una breve explicación.",
  "Si dos documentos no tienen relación relevante, no la inventes.",
  "Basa tu respuesta únicamente en el contenido proporcionado.",
].join(" ");

export function registerIdentifyDocumentRelationsTool(server: McpServer): void {
  server.registerTool(
    "identify_document_relations",
    {
      title: "Identificar relaciones entre documentos",
      description:
        "Analiza dos o más artículos de ReadHub y describe cómo se relacionan entre sí (se complementan, se contradicen, uno amplía a otro, dependencias conceptuales). Acepta ids explícitos o un tema para descubrir artículos relevantes mediante búsqueda semántica.",
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
          2,
          SYSTEM_PROMPT,
          (found) =>
            `${formatArticlesForPrompt(found)}\n\nIdentifica las relaciones entre los ${found.length} documentos anteriores.`,
        );

        return toToolResult({ articles, discoveryNote, relations: analysis });
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
