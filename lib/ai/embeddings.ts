import "server-only";

import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "@/lib/constants/ai";

interface OpenAIEmbeddingResponse {
  data: { index: number; embedding: number[] }[];
}

function validateEmbedding(embedding: number[] | undefined): number[] {
  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Dimensión de embedding inesperada: se esperaban ${EMBEDDING_DIMENSIONS} y se recibieron ${embedding?.length ?? 0}.`,
    );
  }

  if (
    embedding.some((value) => typeof value !== "number" || !Number.isFinite(value))
  ) {
    throw new Error("El embedding recibido contiene valores no numéricos.");
  }

  return embedding;
}

/**
 * Único punto de contacto con el proveedor de embeddings (OpenAI). Ningún
 * otro módulo debe conocer el endpoint, el modelo ni el formato de la
 * petición — así se puede cambiar de proveedor sin tocar quien lo consume.
 *
 * Acepta uno o varios textos en una sola petición: el endpoint de OpenAI
 * soporta `input` como array de forma nativa, así que indexar un artículo
 * con N chunks cuesta 1 llamada HTTP en vez de N (menos overhead de red y
 * mucho menor riesgo de rate limit frente a N llamadas paralelas).
 */
export async function generateEmbeddings(
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no está configurada.");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Error generando embeddings (${response.status}): ${errorBody}`,
    );
  }

  const body = (await response.json()) as OpenAIEmbeddingResponse;

  // La API devuelve los resultados con su índice original, pero no garantiza
  // el orden de llegada en el array -- se reordenan explícitamente en vez de
  // asumir que `data[i]` corresponde a `texts[i]`.
  const embeddings: (number[] | undefined)[] = new Array(texts.length);
  for (const item of body.data ?? []) {
    if (item.index >= 0 && item.index < texts.length) {
      embeddings[item.index] = validateEmbedding(item.embedding);
    }
  }

  // Una respuesta parcial (menos resultados que textos enviados) no debe
  // propagarse en silencio como huecos `undefined` -- falla explícitamente
  // aquí, en el único punto que conoce el contrato del proveedor.
  const missingIndexes = embeddings
    .map((embedding, index) => (embedding ? null : index))
    .filter((index): index is number => index !== null);

  if (missingIndexes.length > 0) {
    throw new Error(
      `El proveedor de embeddings no devolvió resultado para ${missingIndexes.length} de ${texts.length} textos (índices: ${missingIndexes.join(", ")}).`,
    );
  }

  return embeddings as number[][];
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const [embedding] = await generateEmbeddings([text]);
  return embedding;
}
