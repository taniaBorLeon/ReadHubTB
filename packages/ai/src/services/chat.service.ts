import "server-only";

import { searchRelevantChunks } from "./vector-search.service";
import { buildRagContext, NO_CONTEXT_MESSAGE } from "./context-builder.service";
import type { ContextSource, BuildContextResult } from "./context-builder.service";
import { generateChatCompletion, generateChatCompletionStream } from "../chat";
import { GROQ_MODEL } from "../constants";

export interface ChatQueryOptions {
  matchCount?: number;
  minSimilarity?: number;
  maxContextDocuments?: number;
  maxContextChars?: number;
}

export interface ChatQueryResult {
  answer: string;
  sources: ContextSource[];
  hasContext: boolean;
  metadata: {
    model: string;
    retrievedChunks: number;
    usedDocuments: number;
    respondedAt: string;
    llmInvoked: boolean;
  };
}

function buildResult(
  answer: string,
  context: BuildContextResult,
  retrievedChunksCount: number,
  llmInvoked: boolean,
): ChatQueryResult {
  return {
    answer,
    sources: context.sources,
    hasContext: context.hasContext,
    metadata: {
      model: GROQ_MODEL,
      retrievedChunks: retrievedChunksCount,
      usedDocuments: context.sources.length,
      respondedAt: new Date().toISOString(),
      llmInvoked,
    },
  };
}

/**
 * Cortocircuito anti-alucinación: si no hay contexto relevante, responde con
 * la frase canónica SIN llamar al modelo. Un LLM sin contexto no dice "no
 * sé": inventa, y obedece casi siempre la instrucción de no hacerlo salvo en
 * casos esporádicos -- justo el fallo más difícil de detectar. Resolverlo
 * antes de la llamada, no dentro del prompt, elimina la posibilidad.
 */
async function respondWithContext(
  context: BuildContextResult,
  retrievedChunksCount: number,
): Promise<ChatQueryResult> {
  if (!context.hasContext) {
    return buildResult(NO_CONTEXT_MESSAGE, context, retrievedChunksCount, false);
  }

  const answer = await generateChatCompletion(
    context.systemPrompt,
    context.userPrompt,
  );

  return buildResult(answer, context, retrievedChunksCount, true);
}

/**
 * Único punto de entrada del asistente inteligente. Orquesta
 * vector-search.service (embedding de la consulta + búsqueda semántica) y
 * context-builder.service (construcción del prompt) y solo entonces invoca
 * a Groq -- no reimplementa ninguna de esas dos responsabilidades.
 */
export async function answerQuery(
  query: string,
  options: ChatQueryOptions = {},
): Promise<ChatQueryResult> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error("La consulta no puede estar vacía.");
  }

  const retrievedChunks = await searchRelevantChunks(trimmedQuery, {
    matchCount: options.matchCount,
    minSimilarity: options.minSimilarity,
  });

  const context = buildRagContext(trimmedQuery, retrievedChunks, {
    maxDocuments: options.maxContextDocuments,
    maxContextChars: options.maxContextChars,
  });

  return respondWithContext(context, retrievedChunks.length);
}

export type ChatStreamEvent =
  | { type: "sources"; sources: ContextSource[]; hasContext: boolean }
  | { type: "delta"; text: string }
  | {
      type: "done";
      metadata: ChatQueryResult["metadata"];
    };

/**
 * Variante en streaming del mismo pipeline: emite las fuentes en cuanto
 * existen (antes de que empiece a llegar texto), luego un evento por
 * fragmento de texto, y un evento final con los metadatos. Mismo
 * cortocircuito anti-alucinación que `answerQuery` -- si no hay contexto,
 * emite la frase canónica como un único evento de texto sin invocar a Groq.
 */
export async function* answerQueryStream(
  query: string,
  options: ChatQueryOptions = {},
): AsyncGenerator<ChatStreamEvent> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error("La consulta no puede estar vacía.");
  }

  const retrievedChunks = await searchRelevantChunks(trimmedQuery, {
    matchCount: options.matchCount,
    minSimilarity: options.minSimilarity,
  });

  const context = buildRagContext(trimmedQuery, retrievedChunks, {
    maxDocuments: options.maxContextDocuments,
    maxContextChars: options.maxContextChars,
  });

  yield { type: "sources", sources: context.sources, hasContext: context.hasContext };

  if (!context.hasContext) {
    yield { type: "delta", text: NO_CONTEXT_MESSAGE };
    yield {
      type: "done",
      metadata: buildResult(NO_CONTEXT_MESSAGE, context, retrievedChunks.length, false)
        .metadata,
    };
    return;
  }

  for await (const event of generateChatCompletionStream(
    context.systemPrompt,
    context.userPrompt,
  )) {
    if (event.delta) {
      yield { type: "delta", text: event.delta };
    }
  }

  yield {
    type: "done",
    metadata: {
      model: GROQ_MODEL,
      retrievedChunks: retrievedChunks.length,
      usedDocuments: context.sources.length,
      respondedAt: new Date().toISOString(),
      llmInvoked: true,
    },
  };
}

/**
 * Variante que responde a partir de fragmentos YA recuperados, sin volver a
 * buscar. Permite verificar el cortocircuito anti-alucinación (y el resto
 * del pipeline) sin depender de ningún proveedor externo.
 */
export async function answerFromChunks(
  query: string,
  retrievedChunks: Parameters<typeof buildRagContext>[1],
  options: ChatQueryOptions = {},
): Promise<ChatQueryResult> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error("La consulta no puede estar vacía.");
  }

  const context = buildRagContext(trimmedQuery, retrievedChunks, {
    maxDocuments: options.maxContextDocuments,
    maxContextChars: options.maxContextChars,
  });

  return respondWithContext(context, retrievedChunks.length);
}
