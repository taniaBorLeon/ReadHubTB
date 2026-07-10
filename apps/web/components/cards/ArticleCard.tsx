import Link from "next/link";
import Image from "next/image";
import { Eye, Heart } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";
import { getPublicStorageUrl } from "@readhub/shared/storage-url";
import type { ArticleWithStats } from "@readhub/types/article";

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(
    new Date(dateString),
  );
}

export function ArticleCard({ article }: { article: ArticleWithStats }) {
  const imageUrl = article.image_path
    ? getPublicStorageUrl(article.image_path)
    : null;

  return (
    <Link href={ROUTES.article(article.id)} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-shadow duration-200 hover:shadow-card-hover">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={article.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-300 ease-out-soft group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              Sin portada
            </div>
          )}
        </div>

        <CardHeader className="gap-2">
          <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-foreground group-hover:text-primary">
            {article.title}
          </h3>
          {article.summary && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {article.summary}
            </p>
          )}
        </CardHeader>

        <CardContent className="mt-auto flex flex-col gap-3 pt-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate">{article.author_email}</span>
            <span>{formatDate(article.created_at)}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3.5" />
              {article.views_count}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3.5 text-like" />
              {article.likes_count}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
