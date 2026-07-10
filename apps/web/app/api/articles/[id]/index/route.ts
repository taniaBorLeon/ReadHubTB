import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/api/require-user";
import { createServiceRoleClient } from "@readhub/database/service-role";
import { generateArticleEmbeddings } from "@readhub/ai/services/embedding";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth.errorResponse) return auth.errorResponse;

  const { id: articleId } = await params;

  if (!UUID_PATTERN.test(articleId)) {
    return NextResponse.json(
      { success: false, error: "Identificador de artículo inválido." },
      { status: 400 },
    );
  }

  // Solo el autor puede forzar la (re)indexación de su propio artículo --
  // sin esto, cualquier usuario autenticado podría gatillar recálculos de
  // embeddings (costo de OpenAI) sobre artículos ajenos.
  const supabase = createServiceRoleClient();
  const { data: article, error: articleError } = await supabase
    .from("articles")
    .select("author_id")
    .eq("id", articleId)
    .single();

  if (articleError || !article) {
    return NextResponse.json(
      { success: false, error: "Artículo no encontrado." },
      { status: 404 },
    );
  }

  if (article.author_id !== auth.user.id) {
    return NextResponse.json(
      { success: false, error: "No autorizado." },
      { status: 403 },
    );
  }

  try {
    const result = await generateArticleEmbeddings(articleId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error(
      `[rag:index] Falló la indexación del artículo ${articleId}`,
      error,
    );
    return NextResponse.json(
      { success: false, error: "No se pudo generar el embedding del artículo." },
      { status: 500 },
    );
  }
}
