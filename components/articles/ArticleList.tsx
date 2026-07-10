import { ArticleCard } from "@/components/cards/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import type { ArticleWithStats } from "@/types/article";

export function ArticleList({
  articles,
  loading,
  error,
  onRetry,
}: {
  articles: ArticleWithStats[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="aspect-[4/5] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (articles.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay artículos publicados."
        description="Sé el primero en compartir uno."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
