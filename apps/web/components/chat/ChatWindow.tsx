"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, RotateCcw } from "lucide-react";

import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { LoadingMessage } from "@/components/chat/LoadingMessage";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listArticles } from "@/services/article.service";
import type { ChatMessage as ChatMessageType } from "@readhub/types/chat";

function useArticleSuggestions() {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    // Las sugerencias se derivan de artículos publicados REALES: si se
    // escribieran a mano, mencionarían temas que ya no existen en cuanto el
    // contenido cambie, y el asistente sugeriría preguntas que no puede
    // responder.
    listArticles()
      .then((articles) => {
        if (cancelled) return;
        setSuggestions(
          articles
            .slice(0, 4)
            .map((article) => `¿Qué dice ReadHub sobre "${article.title}"?`),
        );
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return suggestions;
}

export function ChatWindow({
  messages,
  loading,
  error,
  onSend,
  onStop,
  onReset,
}: {
  messages: ChatMessageType[];
  loading: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onStop: () => void;
  onReset: () => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const suggestions = useArticleSuggestions();

  useEffect(() => {
    // El array de mensajes cambia en CADA token del streaming: encadenar
    // scrolls suaves que se cancelan entre sí provoca tirones y bloquea el
    // hilo principal. Se agenda un único desplazamiento instantáneo por
    // frame, cancelando cualquiera pendiente.
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      rafRef.current = null;
    });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [messages]);

  const lastMessage = messages[messages.length - 1];
  // El indicador de "recuperando" solo tiene sentido antes de que exista
  // algo que pintar: en cuanto llegan las fuentes o el primer token, ya no
  // debe seguir puesto.
  const isRetrieving =
    loading &&
    lastMessage?.role === "assistant" &&
    !lastMessage.sources &&
    lastMessage.content.length === 0;

  return (
    <Card className="flex h-[calc(100vh-14rem)] min-h-[420px] flex-col overflow-hidden">
      <div className="flex items-center justify-end border-b border-border px-4 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={messages.length === 0}
        >
          <RotateCcw className="size-4" />
          Nueva conversación
        </Button>
      </div>
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6"
        aria-live="polite"
        role="log"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col gap-4">
            <EmptyState
              icon={<MessageCircle className="size-8 text-muted-foreground" />}
              title="Pregúntale a ReadHub"
              description="Hazme una pregunta sobre los artículos publicados en la plataforma."
            />
            {suggestions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onSend(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isRetrieving && <LoadingMessage />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      <div className="border-t border-border p-4">
        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
        <ChatInput onSend={onSend} onStop={onStop} loading={loading} />
      </div>
    </Card>
  );
}
