import { CommentItem } from "@/components/comments/CommentItem";
import { CommentForm } from "@/components/comments/CommentForm";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import type { CommentWithAuthor } from "@readhub/types/comment";

export function CommentList({
  comments,
  loading,
  submitting,
  error,
  userId,
  onAddComment,
}: {
  comments: CommentWithAuthor[];
  loading: boolean;
  submitting: boolean;
  error?: string | null;
  userId: string | null;
  onAddComment: (text: string) => Promise<boolean>;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">
        Comentarios ({comments.length})
      </h2>

      {userId ? (
        <CommentForm onSubmit={onAddComment} submitting={submitting} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Inicia sesión para comentar.
        </p>
      )}

      {error && <ErrorState message={error} />}

      <Separator />

      {loading ? (
        <LoadingState message="Cargando comentarios..." />
      ) : comments.length === 0 ? (
        <EmptyState
          title="Aún no hay comentarios."
          description="Sé el primero en comentar."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </section>
  );
}
