"use client";

import { useEffect, useRef } from "react";
import { MessageCircle } from "lucide-react";

import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { LoadingMessage } from "@/components/chat/LoadingMessage";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import type { ChatMessage as ChatMessageType } from "@readhub/types/chat";

export function ChatWindow({
  messages,
  loading,
  error,
  onSend,
}: {
  messages: ChatMessageType[];
  loading: boolean;
  error: string | null;
  onSend: (text: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  return (
    <Card className="flex h-[calc(100vh-14rem)] min-h-[420px] flex-col overflow-hidden">
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6"
        aria-live="polite"
        role="log"
      >
        {messages.length === 0 ? (
          <EmptyState
            icon={<MessageCircle className="size-8 text-muted-foreground" />}
            title="Pregúntale a ReadHub"
            description="Hazme una pregunta sobre los artículos publicados en la plataforma."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                animate={
                  message.role === "assistant" &&
                  index === messages.length - 1
                }
              />
            ))}
            {loading && <LoadingMessage />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      <div className="border-t border-border p-4">
        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
        <ChatInput onSend={onSend} disabled={loading} />
      </div>
    </Card>
  );
}
