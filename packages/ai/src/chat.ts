import "server-only";
import Anthropic from "@anthropic-ai/sdk";

import { CLAUDE_MAX_TOKENS, CLAUDE_MODEL } from "./constants";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY no está configurada.");
  }

  client = new Anthropic({ apiKey });
  return client;
}

/**
 * Único punto de contacto con Claude. Ningún otro módulo conoce el SDK, el
 * modelo ni el formato de la petición -- así se puede sustituir el
 * proveedor de generación sin tocar chat.service.ts ni nada río arriba.
 */
export async function generateChatCompletion(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude no devolvió contenido de texto.");
  }

  return textBlock.text;
}
