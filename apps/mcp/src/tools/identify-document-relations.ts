import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createServiceRoleClient } from "@readhub/database/service-role";
import { generateChatCompletion } from "@readhub/ai/chat";

import { resolveArticleIds } from "../lib/resolve-articles.js";
import { fetchArticlesForAnalysis, formatArticlesForPrompt } from "../lib/article-corpus.js";
import { toErrorResult, toToolResult } from "../lib/tool-result.js";

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
        const supabase = createServiceRoleClient();
        const { ids, discoveryNote } = await resolveArticleIds({ articleIds, topic });

        if (ids.length < 2) {
          throw new Error(
            "Se necesitan al menos 2 artículos distintos para identificar relaciones entre ellos.",
          );
        }

        const articles = await fetchArticlesForAnalysis(supabase, ids);
        if (articles.length < 2) {
          throw new Error(
            "No se encontraron al menos 2 artículos válidos para analizar.",
          );
        }

        const userPrompt = `${formatArticlesForPrompt(articles)}\n\nIdentifica las relaciones entre los ${articles.length} documentos anteriores.`;
        const analysis = await generateChatCompletion(SYSTEM_PROMPT, userPrompt);

        return toToolResult({
          articles: articles.map((article) => ({ id: article.id, title: article.title })),
          discoveryNote,
          relations: analysis,
        });
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
