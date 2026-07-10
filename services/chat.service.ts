import "server-only";

import { searchRelevantChunks } from "@/services/vector-search.service";
import { buildRagContext } from "@/services/context-builder.service";
import type { ContextSource } from "@/services/context-builder.service";
import { generateChatCompletion } from "@/lib/ai/chat";
import { CLAUDE_MODEL } from "@/lib/constants/ai";

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
  };
}

/**
 * Único punto de entrada del asistente inteligente. Orquesta
 * vector-search.service (embedding de la consulta + búsqueda semántica) y
 * context-builder.service (construcción del prompt) y solo entonces invoca
 * a Claude -- no reimplementa ninguna de esas dos responsabilidades.
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

  const answer = await generateChatCompletion(
    context.systemPrompt,
    context.userPrompt,
  );

  return {
    answer,
    sources: context.sources,
    hasContext: context.hasContext,
    metadata: {
      model: CLAUDE_MODEL,
      retrievedChunks: retrievedChunks.length,
      usedDocuments: context.sources.length,
      respondedAt: new Date().toISOString(),
    },
  };
}
