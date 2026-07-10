import type { PromptMessage } from "@modelcontextprotocol/sdk/types.js";

/**
 * Bloques de mensaje compartidos por todos los Prompts: un texto de
 * instrucción, o el contenido de un artículo ya obtenido (reutilizando la
 * misma consulta que su Tool/Resource equivalente) embebido como recurso,
 * para que el cliente MCP razone sobre datos reales y no sobre un resumen
 * de segunda mano hecho por el propio Prompt.
 */
export function textMessage(
  text: string,
  role: "user" | "assistant" = "user",
): PromptMessage {
  return { role, content: { type: "text", text } };
}

export function articleResourceMessage(
  article: unknown,
  uri: string,
): PromptMessage {
  return {
    role: "user",
    content: {
      type: "resource",
      resource: {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(article, null, 2),
      },
    },
  };
}
