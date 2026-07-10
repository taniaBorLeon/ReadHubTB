export function validateComment(text: string): string | null {
  if (!text.trim()) {
    return "El comentario no puede estar vacío.";
  }
  return null;
}
