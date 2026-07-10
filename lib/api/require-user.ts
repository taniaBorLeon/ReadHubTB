import "server-only";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type RequireUserResult =
  | { user: User; errorResponse?: undefined }
  | { user?: undefined; errorResponse: NextResponse };

/**
 * Chequeo de sesión compartido por los Route Handlers del sistema RAG
 * (antes duplicado idéntico en cada uno). El middleware ya bloquea con 401
 * cualquier request sin sesión a /api/*, así que esto es una segunda capa
 * de defensa, no la única -- pero cada Route Handler necesita igual el
 * objeto `user` para sus propias validaciones de autorización.
 */
export async function requireUser(): Promise<RequireUserResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: "No autenticado." },
        { status: 401 },
      ),
    };
  }

  return { user };
}
