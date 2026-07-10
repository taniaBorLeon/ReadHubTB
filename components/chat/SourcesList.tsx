import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/constants/routes";
import type { ChatSource } from "@/types/chat";

export function SourcesList({ sources }: { sources: ChatSource[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
      <p className="text-xs font-medium text-muted-foreground">
        Fuentes utilizadas
      </p>
      <ul className="flex flex-col gap-1.5">
        {sources.map((source) => (
          <li key={source.articleId}>
            <Link
              href={ROUTES.article(source.articleId)}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:border-primary hover:bg-accent"
            >
              <span className="truncate">
                {source.rank}. {source.articleTitle}
              </span>
              <Badge variant="outline" className="shrink-0">
                {Math.round(source.similarity * 100)}%
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
