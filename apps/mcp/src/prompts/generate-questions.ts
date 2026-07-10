import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createServiceRoleClient } from "@readhub/database/service-role";
import { getArticleWithStats } from "@readhub/database/queries/articles";

import { articleResourceMessage, textMessage } from "../lib/prompt-content.js";

export function registerGenerateQuestionsPrompt(server: McpServer): void {
  server.registerPrompt(
    "generate_questions",
    {
      title: "Generar preguntas",
      description:
        "Genera preguntas de comprensión o discusión sobre un artículo de ReadHub, útiles para evaluar lectura o abrir debate. Reutiliza la misma consulta que la Tool get_article.",
      argsSchema: {
        articleId: z
          .string()
          .uuid()
          .describe("Id (UUID) del artículo sobre el que generar preguntas"),
        count: z
          .string()
          .optional()
          .describe("Número de preguntas a generar (por defecto 5)"),
      },
    },
    async ({ articleId, count }) => {
      const article = await getArticleWithStats(
        createServiceRoleClient(),
        articleId,
      );
      if (!article) {
        throw new Error(`No existe ningún artículo con id "${articleId}".`);
      }

      const questionCount = count ? Number(count) : 5;

      return {
        description: `Preguntas sobre el artículo "${article.title}"`,
        messages: [
          articleResourceMessage(article, `readhub://articles/${articleId}`),
          textMessage(
            `Genera ${questionCount} preguntas sobre el artículo anterior, combinando preguntas de comprensión literal con preguntas de discusión/reflexión más abiertas. Numéralas y ordénalas de menor a mayor dificultad.`,
          ),
        ],
      };
    },
  );
}
