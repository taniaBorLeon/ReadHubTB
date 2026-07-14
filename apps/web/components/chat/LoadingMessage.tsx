import { memo } from "react";
import { Bot } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const LoadingMessage = memo(function LoadingMessage() {
  return (
    <div className="flex gap-3" role="status" aria-label="El asistente está escribiendo">
      <Avatar className="size-8 shrink-0">
        <AvatarFallback>
          <Bot className="size-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card px-4 py-3">
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
      </div>
    </div>
  );
});
