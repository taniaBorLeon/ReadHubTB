import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createServiceRoleClient } from "@readhub/database/service-role";
import { getArticleWithStats } from "@readhub/database/queries/articles";

import { articleResourceMessage, textMessage } from "../lib/prompt-content.js";

export function registerSummarizeArticlePrompt(server: McpServer): void {
  server.registerPrompt(
    "summarize_article",
    {
      title: "Resumir artículo",
      description:
        "Genera un resumen conciso de un artículo de ReadHub a partir de su id. Reutiliza la misma consulta que la Tool get_article y el Resource readhub://articles/{articleId}.",
      argsSchema: {
        articleId: z.string().uuid().describe("Id (UUID) del artículo a resumir"),
        maxSentences: z
          .string()
          .optional()
          .describe("Número máximo de frases del resumen (por defecto 5)"),
      },
    },
    async ({ articleId, maxSentences }) => {
      const article = await getArticleWithStats(
        createServiceRoleClient(),
        articleId,
      );
      if (!article) {
        throw new Error(`No existe ningún artículo con id "${articleId}".`);
      }

      const sentenceLimit = maxSentences ? Number(maxSentences) : 5;

      return {
        description: `Resumen del artículo "${article.title}"`,
        messages: [
          articleResourceMessage(article, `readhub://articles/${articleId}`),
          textMessage(
            `Resume el artículo anterior en un máximo de ${sentenceLimit} frases, centrándote en sus ideas principales. No inventes información que no esté en el contenido proporcionado.`,
          ),
        ],
      };
    },
  );
}
