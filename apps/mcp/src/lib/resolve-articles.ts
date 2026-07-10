import { searchRelevantChunks } from "@readhub/ai/services/vector-search";

export interface ArticleSelector {
  articleIds?: string;
  topic?: string;
}

const DEFAULT_MAX_TOPIC_ARTICLES = 5;

/**
 * Resuelve un conjunto de ids de artículo a partir de una lista explícita o,
 * si no se conocen, de un tema en lenguaje natural resuelto mediante
 * búsqueda semántica (RAG). Compartido por el Prompt `compare_articles` y
 * por las Tools de análisis avanzado para no repetir esta resolución en
 * cada una.
 */
export async function resolveArticleIds(
  { articleIds, topic }: ArticleSelector,
  options: { maxTopicArticles?: number } = {},
): Promise<{ ids: string[]; discoveryNote: string }> {
  if (articleIds?.trim()) {
    const ids = [
      ...new Set(
        articleIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
    return { ids, discoveryNote: "" };
  }

  if (topic?.trim()) {
    const chunks = await searchRelevantChunks(topic, { matchCount: 15 });
    const ids = [...new Set(chunks.map((chunk) => chunk.articleId))].slice(
      0,
      options.maxTopicArticles ?? DEFAULT_MAX_TOPIC_ARTICLES,
    );
    return {
      ids,
      discoveryNote: ` (descubiertos mediante búsqueda semántica sobre "${topic}")`,
    };
  }

  throw new Error(
    "Debes indicar `articleIds` (ids separados por coma) o `topic` (tema a buscar).",
  );
}
