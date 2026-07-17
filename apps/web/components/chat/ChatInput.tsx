"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Send, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatInput({
  onSend,
  onStop,
  loading,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  loading?: boolean;
}) {
  const [value, setValue] = useState("");

  function submit() {
    if (!value.trim() || loading) return;
    onSend(value);
    setValue("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) {
      onStop();
      return;
    }
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Pregúntale algo a ReadHub..."
        rows={1}
        disabled={loading}
        aria-label="Escribe tu consulta para el asistente"
        className="min-h-[44px] flex-1 resize-none"
      />
      {loading ? (
        <Button
          type="submit"
          size="icon"
          variant="destructive"
          aria-label="Detener respuesta"
        >
          <Square />
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon"
          disabled={!value.trim()}
          aria-label="Enviar consulta"
        >
          <Send />
        </Button>
      )}
    </form>
  );
}
