"use client";

import { memo } from "react";
import { Bot, User } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SourcesList } from "@/components/chat/SourcesList";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@readhub/types/chat";

// Memoizado: el hook reemplaza el array de mensajes en CADA token del
// streaming, pero solo cambia el objeto del mensaje que crece. Sin memo,
// cada token repintaría la conversación ENTERA -- en una respuesta de 400
// tokens con 10 mensajes previos son unos 4000 renders evitables.
export const ChatMessage = memo(function ChatMessage({
  message,
}: {
  message: ChatMessageType;
}) {
  const isUser = message.role === "user";

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
          {message.content}
          {message.isStreaming && (
            <span
              className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-current align-middle"
              aria-hidden="true"
            />
          )}
        </p>
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourcesList sources={message.sources} />
        )}
      </div>
    </div>
  );
});
