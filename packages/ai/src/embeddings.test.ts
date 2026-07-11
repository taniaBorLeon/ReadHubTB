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
  const originalApiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalApiKey;
    vi.unstubAllGlobals();
  });

  it("devuelve un array vacío sin llamar a fetch cuando no hay textos", async () => {
    const result = await generateEmbeddings([]);

    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("lanza si OPENAI_API_KEY no está configurada", async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(generateEmbeddings(["hola"])).rejects.toThrow(
      "OPENAI_API_KEY no está configurada.",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("lanza con el status y el cuerpo cuando la respuesta HTTP no es ok", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: "bad request" }, false, 400));

    await expect(generateEmbeddings(["hola"])).rejects.toThrow(/400/);
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

    const result = await generateEmbeddings(["texto A", "texto B"]);

    expect(result[0]).toEqual(validEmbedding(0));
    expect(result[1]).toEqual(validEmbedding(1));
  });

  // BUG CONOCIDO (no corregido aquí: esta tarea es solo de testing, no debe
  // cambiar comportamiento): el array de resultados se crea con
  // `new Array(texts.length)`, que deja "huecos" reales en los índices no
  // asignados. `Array.prototype.map`/`.filter` saltan los huecos por
  // especificación de JS, así que el chequeo de "respuesta parcial" nunca ve
  // el índice faltante y el `undefined` se cuela en silencio -- justo lo que
  // el comentario del código dice que no debería pasar. `it.fails` documenta
  // el comportamiento real sin dejar un test en rojo ni mentir sobre qué
  // hace hoy el código.
  it.fails(
    "[bug conocido] debería lanzar si el proveedor no devuelve resultado para todos los textos enviados",
    async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ data: [{ index: 0, embedding: validEmbedding(0) }] }),
      );

      await expect(generateEmbeddings(["texto A", "texto B"])).rejects.toThrow(
        /no devolvió resultado para 1 de 2 textos/,
      );
    },
  );

  it("lanza si un embedding tiene una dimensión inesperada", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: [{ index: 0, embedding: [0.1, 0.2] }] }),
    );

    await expect(generateEmbeddings(["texto"])).rejects.toThrow(
      /Dimensión de embedding inesperada/,
    );
  });

  it("lanza si un embedding contiene valores no numéricos", async () => {
    const bad = validEmbedding(0);
    bad[0] = Number.NaN;
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: [{ index: 0, embedding: bad }] }),
    );

    await expect(generateEmbeddings(["texto"])).rejects.toThrow(
      /valores no numéricos/,
    );
  });

  it("envía el modelo y los textos en el body de la petición", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: [{ index: 0, embedding: validEmbedding(0) }] }),
    );

    await generateEmbeddings(["hola mundo"]);

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.input).toEqual(["hola mundo"]);
    expect(body.model).toBeTruthy();
  });
});

describe("generateEmbedding", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devuelve un único embedding para un único texto", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: [{ index: 0, embedding: validEmbedding(2) }] }),
    );

    const result = await generateEmbedding("texto único");

    expect(result).toEqual(validEmbedding(2));
  });
});
