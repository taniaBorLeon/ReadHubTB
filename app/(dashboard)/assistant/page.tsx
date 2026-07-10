"use client";

import { useChat } from "@/hooks/useChat";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default function AssistantPage() {
  const { messages, loading, error, sendMessage } = useChat();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Asistente ReadHub
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pregunta lo que quieras sobre los artículos publicados: las
          respuestas se basan únicamente en el conocimiento de la plataforma.
        </p>
      </div>
      <ChatWindow
        messages={messages}
        loading={loading}
        error={error}
        onSend={sendMessage}
      />
    </div>
  );
}
