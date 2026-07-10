import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createServiceRoleClient } from "@readhub/database/service-role";
import { getArticleWithStats } from "@readhub/database/queries/articles";

import { articleResourceMessage, textMessage } from "../lib/prompt-content.js";

export function registerExtractKeyConceptsPrompt(server: McpServer): void {
  server.registerPrompt(
    "extract_key_concepts",
    {
      title: "Extraer conceptos clave",
      description:
        "Extrae los conceptos y términos clave de un artículo de ReadHub, cada uno con una definición breve. Reutiliza la misma consulta que la Tool get_article.",
      argsSchema: {
        articleId: z
          .string()
          .uuid()
          .describe("Id (UUID) del artículo del que extraer conceptos clave"),
      },
    },
    async ({ articleId }) => {
      const article = await getArticleWithStats(
        createServiceRoleClient(),
        articleId,
      );
      if (!article) {
        throw new Error(`No existe ningún artículo con id "${articleId}".`);
      }

      return {
        description: `Conceptos clave del artículo "${article.title}"`,
        messages: [
          articleResourceMessage(article, `readhub://articles/${articleId}`),
          textMessage(
            "Extrae los conceptos y términos clave del artículo anterior. Para cada uno, da una definición breve (una frase) basada únicamente en el contenido proporcionado, sin añadir conocimiento externo que el artículo no mencione.",
          ),
        ],
      };
    },
  );
}
