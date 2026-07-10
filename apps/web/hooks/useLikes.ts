"use client";

import { useCallback, useState } from "react";

import { toggleLike } from "@/services/article.service";

export function useLikes(
  articleId: string,
  userId: string | null,
  initialLiked: boolean,
  initialCount: number,
) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback(async () => {
    if (!userId) {
      setError("Debes iniciar sesión para dar Me gusta.");
      return;
    }

    setLoading(true);
    setError(null);
    const previousLiked = liked;
    const previousCount = count;
    setLiked(!previousLiked);
    setCount(previousLiked ? previousCount - 1 : previousCount + 1);

    try {
      const newLiked = await toggleLike(articleId, userId);
      setLiked(newLiked);
    } catch (err) {
      setLiked(previousLiked);
      setCount(previousCount);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo registrar el Me gusta.",
      );
    } finally {
      setLoading(false);
    }
  }, [articleId, userId, liked, count]);

  return { liked, count, loading, error, toggle };
}
