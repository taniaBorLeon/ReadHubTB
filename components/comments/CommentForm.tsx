"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CommentForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (text: string) => Promise<boolean>;
  submitting: boolean;
}) {
  const [text, setText] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const success = await onSubmit(text);
    if (success) setText("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Escribe un comentario..."
        rows={3}
      />
      <Button type="submit" className="w-fit" disabled={submitting}>
        {submitting ? "Publicando..." : "Comentar"}
      </Button>
    </form>
  );
}
