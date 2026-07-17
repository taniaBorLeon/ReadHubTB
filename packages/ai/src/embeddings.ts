import "server-only";

import {
  EMBEDDING_BATCH_SIZE,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from "./constants";

export type EmbeddingInputType = "query" | "document";

interface VoyageEmbeddingResponse {
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

function chunkArray<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    batches.push(items.slice(start, start + size));
  }
  return batches;
}

async function requestEmbeddingBatch(
  texts: string[],
  inputType: EmbeddingInputType,
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY no está configurada.");
  }

  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    // No se expone el cuerpo crudo de la respuesta: podría filtrar detalles
    // internos del proveedor (mensajes de cuota, identificadores de cuenta).
    throw new Error(
      `Error generando embeddings (${response.status}) con el proveedor de embeddings.`,
    );
  }

  const body = (await response.json()) as VoyageEmbeddingResponse;

  // Voyage devuelve los resultados con su índice original, pero no garantiza
  // el orden de llegada en el array -- se reordenan explícitamente en vez de
  // asumir que `data[i]` corresponde a `texts[i]`.
  const embeddings: (number[] | undefined)[] = Array.from(
    { length: texts.length },
    () => undefined,
  );
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

/**
 * Único punto de contacto con el proveedor de embeddings (Voyage). Ningún
 * otro módulo debe conocer el endpoint, el modelo ni el formato de la
 * petición -- así se puede cambiar de proveedor sin tocar quien lo consume.
 *
 * `inputType` distingue consulta ("query") de documento indexado
 * ("document"): Voyage proyecta ambos de forma distinta y usar el mismo para
 * los dos no da error, solo degrada la calidad de la recuperación en
 * silencio.
 *
 * Trocea en lotes de EMBEDDING_BATCH_SIZE: el proveedor limita cuántos
 * textos acepta por petición, así que indexar un artículo con muchos chunks
 * puede requerir varias llamadas HTTP secuenciales.
 */
export async function generateEmbeddings(
  texts: string[],
  inputType: EmbeddingInputType,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const batches = chunkArray(texts, EMBEDDING_BATCH_SIZE);
  const results: number[][] = [];
  for (const batch of batches) {
    results.push(...(await requestEmbeddingBatch(batch, inputType)));
  }
  return results;
}

export async function generateEmbedding(
  text: string,
  inputType: EmbeddingInputType,
): Promise<number[]> {
  const [embedding] = await generateEmbeddings([text], inputType);
  return embedding;
}

/** Serializa un vector al literal que espera pgvector: "[0.1,0.2,...]". */
export function toPgvectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
