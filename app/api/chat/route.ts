import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/api/require-user";
import { answerQuery } from "@/services/chat.service";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.errorResponse) return auth.errorResponse;

  const body = await request.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query : "";

  if (!query.trim()) {
    return NextResponse.json(
      { error: "La consulta no puede estar vacía." },
      { status: 400 },
    );
  }

  try {
    const result = await answerQuery(query);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[rag:chat] Falló la consulta conversacional", error);
    return NextResponse.json(
      { error: "No se pudo procesar la consulta." },
      { status: 500 },
    );
  }
}
