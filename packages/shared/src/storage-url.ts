import { ARTICLES_BUCKET } from "./storage.constants";

export function getPublicStorageUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${baseUrl}/storage/v1/object/public/${ARTICLES_BUCKET}/${path}`;
}
