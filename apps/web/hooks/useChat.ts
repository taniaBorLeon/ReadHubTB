"use client";

import { useCallback, useRef, useState } from "react";

import type { ChatMessage, ChatSource } from "@readhub/types/chat";

type StreamEvent =
  | { type: "sources"; sources: ChatSource[]; hasContext: boolean }
  | { type: "delta"; text: string }
  | { type: "done"; metadata: unknown }
  | { type: "error"; message: string };

function createMessageId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

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

      const assistantMessageId = createMessageId();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          isStreaming: true,
        },
      ]);

      setLoading(true);
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      function updateAssistantMessage(patch: Partial<ChatMessage>) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? { ...message, ...patch }
              : message,
          ),
        );
      }

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? "No se pudo procesar la consulta.");
        }

        if (!response.body) {
          throw new Error("La respuesta no incluyó contenido en streaming.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        // Un fragmento de red puede cortar una línea NDJSON por la mitad:
        // se acumula en un búfer y solo se procesan las líneas ya completas.
        let buffer = "";
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as StreamEvent;

            if (event.type === "sources") {
              updateAssistantMessage({
                sources: event.sources,
                hasContext: event.hasContext,
              });
            } else if (event.type === "delta") {
              accumulatedText += event.text;
              updateAssistantMessage({ content: accumulatedText });
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          }
        }

        updateAssistantMessage({ isStreaming: false });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Cancelar no es un error que deba mostrarse al usuario.
          updateAssistantMessage({ isStreaming: false });
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : "No se pudo procesar la consulta.";
        setError(message);
        updateAssistantMessage({
          content: message,
          isError: true,
          isStreaming: false,
        });
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [loading],
  );

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setError(null);
    setLoading(false);
  }, []);

  return { messages, loading, error, sendMessage, stop, reset };
}
