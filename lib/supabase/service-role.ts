import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

let client: SupabaseClient<Database> | null = null;

/**
 * Cliente con la service_role key: bypassa RLS por completo.
 * Uso exclusivo de procesos server-side de confianza (p. ej. embedding.service.ts),
 * nunca desde código que se ejecute en el navegador.
 *
 * Memoizado a nivel de módulo (mismo patrón que el cliente de Anthropic en
 * lib/ai/chat.ts): en un runtime de Node con procesos de larga vida evita
 * reconstruir el cliente en cada llamada; en un runtime serverless de
 * invocación única no cambia nada (cada invocación ya parte de cero).
 */
export function createServiceRoleClient(): SupabaseClient<Database> {
  if (client) return client;

  client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return client;
}
