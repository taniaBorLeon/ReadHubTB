"use client";

import { useCallback, useEffect, useState } from "react";

import { createComment, listComments } from "@/services/comment.service";
import { validateComment } from "@/lib/validators/comment.validators";
import type { CommentWithAuthor } from "@/types/comment";

export function useComments(articleId: string, userId: string | null) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(
    async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      setError(null);
      try {
        const data = await listComments(articleId);
        setComments(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los comentarios.",
        );
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [articleId],
  );

  const refetch = useCallback(() => fetchComments(true), [fetchComments]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addComment = useCallback(
    async (text: string) => {
      const validationError = validateComment(text);
      if (validationError) {
        setError(validationError);
        return false;
      }
      if (!userId) {
        setError("Debes iniciar sesión para comentar.");
        return false;
      }

      setSubmitting(true);
      setError(null);
      try {
        await createComment(articleId, userId, text.trim());
        await fetchComments(false);
        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo publicar el comentario.",
        );
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [articleId, userId, fetchComments],
  );

  return { comments, loading, submitting, error, addComment };
}
