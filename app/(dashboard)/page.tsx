"use client";

import { useArticles } from "@/hooks/useArticles";
import { ArticleList } from "@/components/articles/ArticleList";

export default function HomePage() {
  const { articles, loading, error, refetch } = useArticles();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Artículos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Descubre lo último publicado por la comunidad.
        </p>
      </div>
      <ArticleList
        articles={articles}
        loading={loading}
        error={error}
        onRetry={refetch}
      />
    </div>
  );
}
