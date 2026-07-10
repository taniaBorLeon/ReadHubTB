import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2">
        <BookOpen className="size-10 text-primary" />
        <span className="text-2xl font-semibold tracking-tight text-foreground">
          ReadHub
        </span>
        <p className="text-sm text-muted-foreground">
          Publica y descubre artículos.
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
