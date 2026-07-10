import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createServiceRoleClient } from "@readhub/database/service-role";
import { generateChatCompletion } from "@readhub/ai/chat";

import { resolveArticleIds } from "../lib/resolve-articles.js";
import { fetchArticlesForAnalysis, formatArticlesForPrompt } from "../lib/article-corpus.js";
import { toErrorResult, toToolResult } from "../lib/tool-result.js";

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

        const articles = await fetchArticlesForAnalysis(supabase, ids);
        if (articles.length === 0) {
          throw new Error("No se encontró ningún artículo válido para analizar.");
        }

        const userPrompt = `${formatArticlesForPrompt(articles)}\n\nExtrae los temas principales de los ${articles.length} documentos anteriores.`;
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
