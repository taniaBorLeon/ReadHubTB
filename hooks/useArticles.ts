"use client";

import { useCallback, useEffect, useState } from "react";

import { getArticle, listArticles } from "@/services/article.service";
import type { ArticleDetail, ArticleWithStats } from "@/types/article";

export function useArticles() {
  const [articles, setArticles] = useState<ArticleWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listArticles();
      setArticles(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los artículos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { articles, loading, error, refetch };
}

export function useArticle(articleId: string) {
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getArticle(articleId);
      setArticle(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el artículo.",
      );
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { article, loading, error, refetch };
}
