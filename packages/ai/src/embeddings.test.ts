import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateEmbedding, generateEmbeddings } from "./embeddings";
import { EMBEDDING_DIMENSIONS } from "./constants";

function validEmbedding(seed = 0): number[] {
  return Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => seed + i * 0.001);
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

describe("generateEmbeddings", () => {
  const originalApiKey = process.env.VOYAGE_API_KEY;

  beforeEach(() => {
    process.env.VOYAGE_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    process.env.VOYAGE_API_KEY = originalApiKey;
    vi.unstubAllGlobals();
  });

  it("devuelve un array vacío sin llamar a fetch cuando no hay textos", async () => {
    const result = await generateEmbeddings([], "document");

    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("lanza si VOYAGE_API_KEY no está configurada", async () => {
    delete process.env.VOYAGE_API_KEY;

    await expect(generateEmbeddings(["hola"], "document")).rejects.toThrow(
      "VOYAGE_API_KEY no está configurada.",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("lanza con el status cuando la respuesta HTTP no es ok, sin exponer el cuerpo crudo", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: "bad request" }, false, 400));

    await expect(generateEmbeddings(["hola"], "document")).rejects.toThrow(/400/);
    await expect(generateEmbeddings(["hola"], "document")).rejects.not.toThrow(/bad request/);
  });

  it("reordena los resultados según el índice devuelto, no según el orden de llegada", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        data: [
          { index: 1, embedding: validEmbedding(1) },
          { index: 0, embedding: validEmbedding(0) },
        ],
      }),
    );

    const result = await generateEmbeddings(["texto A", "texto B"], "document");

    expect(result[0]).toEqual(validEmbedding(0));
    expect(result[1]).toEqual(validEmbedding(1));
  });

  it("lanza si el proveedor no devuelve resultado para todos los textos enviados", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: [{ index: 0, embedding: validEmbedding(0) }] }),
    );

    await expect(generateEmbeddings(["texto A", "texto B"], "document")).rejects.toThrow(
      /no devolvió resultado para 1 de 2 textos/,
    );
  });

  it("lanza si un embedding tiene una dimensión inesperada", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: [{ index: 0, embedding: [0.1, 0.2] }] }),
    );

    await expect(generateEmbeddings(["texto"], "document")).rejects.toThrow(
      /Dimensión de embedding inesperada/,
    );
  });

  it("lanza si un embedding contiene valores no numéricos", async () => {
    const bad = validEmbedding(0);
    bad[0] = Number.NaN;
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: [{ index: 0, embedding: bad }] }),
    );

    await expect(generateEmbeddings(["texto"], "document")).rejects.toThrow(
      /valores no numéricos/,
    );
  });

  it("envía el modelo, los textos y el input_type en el body de la petición", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: [{ index: 0, embedding: validEmbedding(0) }] }),
    );

    await generateEmbeddings(["hola mundo"], "document");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.input).toEqual(["hola mundo"]);
    expect(body.model).toBeTruthy();
    expect(body.input_type).toBe("document");
  });

  it("usa input_type 'query' cuando se solicita", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: [{ index: 0, embedding: validEmbedding(0) }] }),
    );

    await generateEmbeddings(["¿qué es ReadHub?"], "query");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.input_type).toBe("query");
  });

  it("trocea en varias peticiones cuando hay más textos que el tamaño de lote", async () => {
    vi.mocked(fetch).mockImplementation(async (_url, init) => {
      const body = JSON.parse((init as RequestInit).body as string);
      const texts = body.input as string[];
      return jsonResponse({
        data: texts.map((_, index) => ({ index, embedding: validEmbedding(index) })),
      });
    });

    const manyTexts = Array.from({ length: 150 }, (_, i) => `texto ${i}`);
    const result = await generateEmbeddings(manyTexts, "document");

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(150);
  });
});

describe("generateEmbedding", () => {
  beforeEach(() => {
    process.env.VOYAGE_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devuelve un único embedding para un único texto", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: [{ index: 0, embedding: validEmbedding(2) }] }),
    );

    const result = await generateEmbedding("texto único", "query");

    expect(result).toEqual(validEmbedding(2));
  });
});
