"use client";

import { useCallback, useState } from "react";

import { createArticle } from "@/services/article.service";
import { uploadArticleFile } from "@/services/storage.service";
import {
  validateArticleForm,
  type ArticleFormValues,
} from "@/lib/validators/article.validators";
import type { FieldErrors } from "@/lib/validators/auth.validators";

export interface PublishArticleInput extends ArticleFormValues {
  summary: string;
  authorId: string;
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const publishArticle = useCallback(async (input: PublishArticleInput) => {
    const validationErrors = validateArticleForm(input);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return null;
    }

    setUploading(true);
    setErrors({});
    try {
      const [documentPath, imagePath] = await Promise.all([
        uploadArticleFile(input.authorId, input.documentFile as File),
        uploadArticleFile(input.authorId, input.imageFile as File),
      ]);
      return await createArticle({
        authorId: input.authorId,
        title: input.title.trim(),
        summary: input.summary.trim() || null,
        documentPath,
        imagePath,
      });
    } catch (err) {
      setErrors({
        form:
          err instanceof Error
            ? err.message
            : "No se pudo publicar el artículo.",
      });
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploading, errors, publishArticle };
}
