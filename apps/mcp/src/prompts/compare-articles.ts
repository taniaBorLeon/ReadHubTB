import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createServiceRoleClient } from "@readhub/database/service-role";
import { getArticleWithStats } from "@readhub/database/queries/articles";
import { searchRelevantChunks } from "@readhub/ai/services/vector-search";

import { articleResourceMessage, textMessage } from "../lib/prompt-content.js";

const MAX_TOPIC_ARTICLES = 4;

export function registerCompareArticlesPrompt(server: McpServer): void {
  server.registerPrompt(
    "compare_articles",
    {
      title: "Comparar artículos",
      description:
        "Compara dos o más artículos de ReadHub. Acepta una lista explícita de ids, o -- si no se conocen -- un tema en lenguaje natural que se resuelve reutilizando la búsqueda semántica (RAG) para descubrir los artículos más relevantes antes de compararlos.",
      argsSchema: {
        articleIds: z
          .string()
          .optional()
          .describe("Ids de los artículos a comparar, separados por coma"),
        topic: z
          .string()
          .optional()
          .describe(
            "Alternativa a articleIds: un tema en lenguaje natural para descubrir artículos relevantes mediante búsqueda semántica",
          ),
      },
    },
    async ({ articleIds, topic }) => {
      const supabase = createServiceRoleClient();

      let ids: string[];
      let discoveryNote = "";

      if (articleIds?.trim()) {
        ids = [...new Set(articleIds.split(",").map((id) => id.trim()).filter(Boolean))];
      } else if (topic?.trim()) {
        const chunks = await searchRelevantChunks(topic, { matchCount: 10 });
        ids = [...new Set(chunks.map((chunk) => chunk.articleId))].slice(
          0,
          MAX_TOPIC_ARTICLES,
        );
        discoveryNote = ` (descubiertos mediante búsqueda semántica sobre "${topic}")`;
      } else {
        throw new Error(
          "Debes indicar `articleIds` (ids separados por coma) o `topic` (tema a buscar).",
        );
      }

      if (ids.length < 2) {
        throw new Error(
          "Se necesitan al menos 2 artículos distintos para poder compararlos.",
        );
      }

      const articles = (
        await Promise.all(ids.map((id) => getArticleWithStats(supabase, id)))
      ).filter((article): article is NonNullable<typeof article> => article !== null);

      if (articles.length < 2) {
        throw new Error(
          "No se encontraron al menos 2 artículos válidos para comparar.",
        );
      }

      return {
        description: `Comparación de ${articles.length} artículos${discoveryNote}`,
        messages: [
          ...articles.map((article) =>
            articleResourceMessage(article, `readhub://articles/${article.id}`),
          ),
          textMessage(
            `Compara los ${articles.length} artículos anteriores. Señala sus similitudes, sus diferencias más relevantes, y en qué se complementan o contradicen entre sí. Basa la comparación únicamente en el contenido proporcionado.`,
          ),
        ],
      };
    },
  );
}
