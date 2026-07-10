import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createServiceRoleClient } from "@readhub/database/service-role";
import { getArticleWithStats } from "@readhub/database/queries/articles";

import { articleResourceMessage, textMessage } from "../lib/prompt-content.js";

export function registerExplainArticlePrompt(server: McpServer): void {
  server.registerPrompt(
    "explain_article",
    {
      title: "Explicar artículo",
      description:
        "Explica el contenido de un artículo de ReadHub de forma accesible, ajustando el nivel a la audiencia indicada. Reutiliza la misma consulta que la Tool get_article.",
      argsSchema: {
        articleId: z.string().describe("Id del artículo a explicar"),
        audience: z
          .string()
          .optional()
          .describe(
            "Audiencia objetivo, p. ej. 'un principiante sin conocimientos previos' (por defecto esa misma)",
          ),
      },
    },
    async ({ articleId, audience }) => {
      const article = await getArticleWithStats(
        createServiceRoleClient(),
        articleId,
      );
      if (!article) {
        throw new Error(`No existe ningún artículo con id "${articleId}".`);
      }

      const targetAudience = audience?.trim() || "un principiante sin conocimientos previos del tema";

      return {
        description: `Explicación del artículo "${article.title}" para ${targetAudience}`,
        messages: [
          articleResourceMessage(article, `readhub://articles/${articleId}`),
          textMessage(
            `Explica el artículo anterior de forma clara y accesible para ${targetAudience}. Usa analogías si ayudan a la comprensión, evita jerga innecesaria y, si usas algún término técnico, defínelo brevemente.`,
          ),
        ],
      };
    },
  );
}
