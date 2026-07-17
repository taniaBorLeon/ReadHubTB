import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/api/require-user";
import { answerQueryStream } from "@readhub/ai/services/chat";

export const runtime = "nodejs";

// Techo de longitud de la consulta: no es solo validación, es un límite de
// coste -- sin él, un texto de 100 KB se vectoriza y se factura igual que
// una pregunta normal.
const MAX_QUERY_LENGTH = 2000;

const encoder = new TextEncoder();

function ndjsonLine(payload: unknown): Uint8Array {
  return encoder.encode(`${JSON.stringify(payload)}\n`);
}

export async function POST(request: NextRequest) {
  // La sesión se resuelve ANTES de abrir el stream: una vez enviada la
  // primera cabecera de la respuesta ya no se puede responder con un 401.
  const auth = await requireUser();
  if (auth.errorResponse) return auth.errorResponse;

  const body = await request.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query : "";
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return NextResponse.json(
      { error: "La consulta no puede estar vacía." },
      { status: 400 },
    );
  }

  if (trimmedQuery.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `La consulta no puede superar ${MAX_QUERY_LENGTH} caracteres.` },
      { status: 400 },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of answerQueryStream(trimmedQuery)) {
          controller.enqueue(ndjsonLine(event));
        }
      } catch (error) {
        console.error("[rag:chat] Falló la consulta conversacional en streaming", error);
        controller.enqueue(
          ndjsonLine({ type: "error", message: "No se pudo procesar la consulta." }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
