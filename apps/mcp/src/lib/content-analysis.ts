import { createServiceRoleClient } from "@readhub/database/service-role";
import { generateChatCompletion } from "@readhub/ai/chat";

import { resolveArticleIds, type ArticleSelector } from "./resolve-articles.js";
import { fetchArticlesForAnalysis, type ArticleForAnalysis } from "./article-corpus.js";

export interface ContentAnalysisResult {
  articles: { id: string; title: string }[];
  discoveryNote: string;
  analysis: string;
}

/**
 * Flujo común a todas las Tools de análisis avanzado: resolver qué
 * artículos analizar (por id o por tema), reunir su contenido completo, y
 * pedirle a Claude el análisis con el prompt de sistema propio de cada Tool.
 * Cada Tool solo aporta su `systemPrompt` y cómo formatear la instrucción
 * final -- el resto (resolución, validación de mínimos, ensamblado y
 * llamada a Claude) no se repite en cada archivo.
 */
export async function runContentAnalysis(
  selector: ArticleSelector,
  minArticles: number,
  systemPrompt: string,
  buildUserPrompt: (articles: ArticleForAnalysis[]) => string,
): Promise<ContentAnalysisResult> {
  const supabase = createServiceRoleClient();
  const { ids, discoveryNote } = await resolveArticleIds(selector);

  if (ids.length < minArticles) {
    throw new Error(
      minArticles > 1
        ? `Se necesitan al menos ${minArticles} artículos distintos.`
        : "Debes indicar `articleIds` o `topic` para seleccionar al menos un artículo.",
    );
  }

  const articles = await fetchArticlesForAnalysis(supabase, ids);
  if (articles.length < minArticles) {
    throw new Error(
      minArticles > 1
        ? `No se encontraron al menos ${minArticles} artículos válidos.`
        : "No se encontró ningún artículo válido.",
    );
  }

  const analysis = await generateChatCompletion(systemPrompt, buildUserPrompt(articles));

  return {
    articles: articles.map((article) => ({ id: article.id, title: article.title })),
    discoveryNote,
    analysis,
  };
}
