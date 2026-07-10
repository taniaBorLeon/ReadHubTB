"use client";

import { useEffect, useState } from "react";
import { Bot, User } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SourcesList } from "@/components/chat/SourcesList";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types/chat";

const REVEAL_STEP_CHARS = 3;
const REVEAL_INTERVAL_MS = 15;

export function ChatMessage({
  message,
  animate = false,
}: {
  message: ChatMessageType;
  animate?: boolean;
}) {
  const isUser = message.role === "user";
  const [displayedContent, setDisplayedContent] = useState(
    animate ? "" : message.content,
  );

  // Revelado progresivo del lado del cliente: chat.service.ts todavía
  // devuelve la respuesta completa (sin streaming real de Claude, fuera de
  // alcance de esta fase). Esto simula el efecto de "escritura" sobre el
  // texto ya recibido, sin requerir cambios en el backend.
  useEffect(() => {
    if (!animate) {
      setDisplayedContent(message.content);
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      index += REVEAL_STEP_CHARS;
      setDisplayedContent(message.content.slice(0, index));
      if (index >= message.content.length) {
        clearInterval(interval);
      }
    }, REVEAL_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.content, animate]);

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <Avatar className="size-8 shrink-0">
        <AvatarFallback>
          {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-3 rounded-xl border px-4 py-3 text-sm",
          isUser
            ? "border-transparent bg-primary text-primary-foreground"
            : message.isError
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-border bg-card text-card-foreground",
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed">
          {displayedContent}
        </p>
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourcesList sources={message.sources} />
        )}
      </div>
    </div>
  );
}
