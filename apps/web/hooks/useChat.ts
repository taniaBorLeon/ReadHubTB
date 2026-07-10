"use client";

import { useCallback, useState } from "react";

import type { ChatMessage } from "@readhub/types/chat";

interface ChatApiResponse {
  answer: string;
  sources: {
    rank: number;
    articleId: string;
    articleTitle: string;
    similarity: number;
  }[];
  hasContext: boolean;
}

function createMessageId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: "user",
          content: trimmed,
          createdAt: new Date().toISOString(),
        },
      ]);
      setLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
        });

        const body = await response.json();

        if (!response.ok) {
          throw new Error(
            body?.error ?? "No se pudo procesar la consulta.",
          );
        }

        const { answer, sources, hasContext } = body as ChatApiResponse;

        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            role: "assistant",
            content: answer,
            sources,
            hasContext,
            createdAt: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo procesar la consulta.";
        setError(message);
        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            role: "assistant",
            content: message,
            isError: true,
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading],
  );

  return { messages, loading, error, sendMessage };
}
