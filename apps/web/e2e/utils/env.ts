/**
 * Lee una variable de entorno opcional para los E2E con un valor por
 * defecto, dejando en un único lugar cuáles son sobreescribibles (CI, otro
 * proyecto de Supabase de pruebas, etc.) sin tocar los specs ni los datos de
 * prueba directamente.
 */
export function envOrDefault(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : fallback;
}
