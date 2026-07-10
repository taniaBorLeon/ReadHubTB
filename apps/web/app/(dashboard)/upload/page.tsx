"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { useUpload } from "@/hooks/useUpload";
import { UploadForm } from "@/components/forms/UploadForm";
import { ROUTES } from "@/lib/constants/routes";

export default function UploadPage() {
  const { user } = useAuth();
  const { uploading, errors, publishArticle } = useUpload();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    const article = await publishArticle({
      title,
      summary,
      documentFile,
      imageFile,
      authorId: user.id,
    });

    if (article) {
      router.push(ROUTES.home);
      router.refresh();
    }
  }

  return (
    <UploadForm
      title={title}
      summary={summary}
      onTitleChange={setTitle}
      onSummaryChange={setSummary}
      onDocumentChange={setDocumentFile}
      onImageChange={setImageFile}
      errors={errors}
      uploading={uploading}
      onSubmit={handleSubmit}
      onCancel={() => router.push(ROUTES.home)}
    />
  );
}
