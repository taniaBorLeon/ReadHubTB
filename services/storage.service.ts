import { createClient } from "@/lib/supabase/client";
import { ARTICLES_BUCKET } from "@/lib/constants/storage";
import { getPublicStorageUrl } from "@/lib/utils/storage-url";

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.\-_]/g, "-");
}

function buildObjectPath(userId: string, file: File): string {
  const timestamp = Date.now();
  return `${userId}/${timestamp}-${sanitizeFileName(file.name)}`;
}

export async function uploadArticleFile(
  userId: string,
  file: File,
): Promise<string> {
  const supabase = createClient();
  const path = buildObjectPath(userId, file);

  const { error } = await supabase.storage
    .from(ARTICLES_BUCKET)
    .upload(path, file);
  if (error) throw error;

  return path;
}

export function getArticleFilePublicUrl(path: string): string {
  return getPublicStorageUrl(path);
}
