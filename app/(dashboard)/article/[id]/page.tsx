"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useArticle } from "@/hooks/useArticles";
import { useLikes } from "@/hooks/useLikes";
import { useComments } from "@/hooks/useComments";
import { registerView } from "@/services/article.service";
import { ArticleContent } from "@/components/articles/ArticleContent";
import { LikeButton } from "@/components/articles/LikeButton";
import { CommentList } from "@/components/comments/CommentList";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

export default function ArticlePage() {
  const params = useParams<{ id: string }>();
  const articleId = params.id;
  const { user } = useAuth();
  const { article, loading, error, refetch } = useArticle(articleId);
  const viewRegistered = useRef(false);

  useEffect(() => {
    if (user && articleId && !viewRegistered.current) {
      viewRegistered.current = true;
      registerView(articleId, user.id).catch(() => {
        viewRegistered.current = false;
      });
    }
  }, [user, articleId]);

  const likes = useLikes(
    articleId,
    user?.id ?? null,
    article?.liked_by_me ?? false,
    article?.likes_count ?? 0,
  );

  const comments = useComments(articleId, user?.id ?? null);

  if (loading) {
    return <LoadingState message="Cargando artículo..." />;
  }

  if (error || !article) {
    return (
      <ErrorState
        message={error ?? "Artículo no encontrado."}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href={ROUTES.home}>
          <ArrowLeft />
          Volver al inicio
        </Link>
      </Button>
      <ArticleContent article={article} />
      <LikeButton
        liked={likes.liked}
        count={likes.count}
        loading={likes.loading}
        error={likes.error}
        onToggle={likes.toggle}
      />
      <CommentList
        comments={comments.comments}
        loading={comments.loading}
        submitting={comments.submitting}
        error={comments.error}
        userId={user?.id ?? null}
        onAddComment={comments.addComment}
      />
    </div>
  );
}
