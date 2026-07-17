import "server-only";
import OpenAI from "openai";

import { GROQ_MAX_TOKENS, GROQ_MODEL } from "./constants";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY no está configurada.");
  }

  client = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });
  return client;
}

export interface ChatCompletionUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Único punto de contacto con Groq. Ningún otro módulo conoce el SDK, la
 * baseURL ni el modelo -- así se puede sustituir el proveedor de generación
 * sin tocar chat.service.ts ni nada río arriba. Groq expone una API
 * compatible con la de OpenAI, así que se reutiliza ese SDK apuntando a otra
 * baseURL en vez de instalar un cliente propio.
 */
export async function generateChatCompletion(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const groq = getClient();

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: GROQ_MAX_TOKENS,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Groq no devolvió contenido de texto.");
  }

  return content;
}

export interface ChatCompletionStreamEvent {
  delta?: string;
  usage?: ChatCompletionUsage;
}

/**
 * Variante en streaming, mismo contrato agnóstico del proveedor: emite un
 * evento por cada fragmento de texto recibido. Pide el uso de tokens
 * explícitamente vía stream_options.include_usage -- Groq lo entrega en un
 * último fragmento cuyo `choices` viene vacío, así que ese evento final solo
 * trae `usage`, nunca `delta`.
 */
export async function* generateChatCompletionStream(
  systemPrompt: string,
  userPrompt: string,
): AsyncGenerator<ChatCompletionStreamEvent> {
  const groq = getClient();

  const stream = await groq.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: GROQ_MAX_TOKENS,
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      yield { delta };
    }

    if (chunk.usage) {
      yield {
        usage: {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
        },
      };
    }
  }
}
