import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createServiceRoleClient } from "@readhub/database/service-role";
import { generateChatCompletion } from "@readhub/ai/chat";

import { resolveArticleIds } from "../lib/resolve-articles.js";
import { fetchArticlesForAnalysis, formatArticlesForPrompt } from "../lib/article-corpus.js";
import { toErrorResult, toToolResult } from "../lib/tool-result.js";

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
        const supabase = createServiceRoleClient();
        const { ids, discoveryNote } = await resolveArticleIds({ articleIds, topic });

        if (ids.length < 2) {
          throw new Error(
            "Se necesitan al menos 2 artículos distintos para poder compararlos.",
          );
        }

        const articles = await fetchArticlesForAnalysis(supabase, ids);
        if (articles.length < 2) {
          throw new Error(
            "No se encontraron al menos 2 artículos válidos para comparar.",
          );
        }

        const userPrompt = `${formatArticlesForPrompt(articles)}\n\nCompara los ${articles.length} documentos anteriores.`;
        const analysis = await generateChatCompletion(SYSTEM_PROMPT, userPrompt);

        return toToolResult({
          articles: articles.map((article) => ({ id: article.id, title: article.title })),
          discoveryNote,
          analysis,
        });
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
