import Image from "next/image";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPublicStorageUrl } from "@/lib/utils/storage-url";
import type { ArticleDetail } from "@/types/article";

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(
    new Date(dateString),
  );
}

export function ArticleContent({ article }: { article: ArticleDetail }) {
  const imageUrl = article.image_path
    ? getPublicStorageUrl(article.image_path)
    : null;
  const documentUrl = article.document_path
    ? getPublicStorageUrl(article.document_path)
    : null;

  return (
    <article className="flex flex-col gap-6">
      {imageUrl && (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border bg-muted">
          <Image
            src={imageUrl}
            alt={article.title}
            fill
            sizes="(min-width: 1024px) 768px, 100vw"
            className="object-cover"
            priority
          />
        </div>
      )}

      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          {article.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{article.author_email}</span>
          <span aria-hidden>·</span>
          <span>{formatDate(article.created_at)}</span>
        </div>
      </header>

      {article.summary && (
        <p className="prose-article text-muted-foreground">
          {article.summary}
        </p>
      )}

      {documentUrl && (
        <Button asChild variant="secondary" className="w-fit">
          <a href={documentUrl} target="_blank" rel="noopener noreferrer">
            <FileText />
            Ver documento completo
          </a>
        </Button>
      )}
    </article>
  );
}
