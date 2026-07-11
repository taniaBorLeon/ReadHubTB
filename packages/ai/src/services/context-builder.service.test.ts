import { describe, expect, it } from "vitest";

import { buildRagContext } from "./context-builder.service";
import type { VectorSearchResult } from "@readhub/types/vector-search";

function chunk(overrides: Partial<VectorSearchResult> = {}): VectorSearchResult {
  return {
    chunkId: "chunk-1",
    articleId: "article-1",
    articleTitle: "Artículo de prueba",
    chunkIndex: 0,
    content: "Contenido suficientemente largo para superar el mínimo de caracteres exigido.",
    similarity: 0.9,
    ...overrides,
  };
}

describe("buildRagContext", () => {
  it("marca hasContext en false y usa el mensaje de 'sin contexto' cuando no hay resultados", () => {
    const result = buildRagContext("¿qué es ReadHub?", []);

    expect(result.hasContext).toBe(false);
    expect(result.sources).toEqual([]);
    expect(result.userPrompt).toContain(
      "No se encontró información relevante en la base de conocimiento de ReadHub para esta consulta.",
    );
  });

  it("devuelve siempre el mismo systemPrompt con la instrucción de no inventar", () => {
    const result = buildRagContext("consulta", []);
    expect(result.systemPrompt).toContain("ÚNICAMENTE");
  });

  it("incluye la pregunta original en el userPrompt", () => {
    const result = buildRagContext("¿cómo funciona el RAG?", []);
    expect(result.userPrompt).toContain("¿cómo funciona el RAG?");
  });

  it("descarta chunks por debajo del umbral de similitud", () => {
    const results = [
      chunk({ articleId: "a", similarity: 0.9 }),
      chunk({ articleId: "b", similarity: 0.5, chunkId: "chunk-2" }),
    ];

    const result = buildRagContext("consulta", results, { minSimilarity: 0.75 });

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].articleId).toBe("a");
  });

  it("descarta chunks con contenido más corto que minChunkLength", () => {
    const results = [
      chunk({ articleId: "a", content: "corto", similarity: 0.9 }),
      chunk({
        articleId: "b",
        chunkId: "chunk-2",
        content: "Este chunk sí tiene contenido suficientemente largo para pasar el filtro.",
        similarity: 0.9,
      }),
    ];

    const result = buildRagContext("consulta", results, { minChunkLength: 40 });

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].articleId).toBe("b");
  });

  it("fusiona chunks contiguos del mismo artículo eliminando el solape duplicado", () => {
    const base = "Título: X\n\nContenido:\nEste es el inicio del artículo y contiene información relevante.";
    const overlap = base.slice(-60);
    const next = `${overlap} Y aquí continúa el resto del contenido tras el solape.`;

    const results = [
      chunk({ chunkId: "c1", chunkIndex: 0, content: base, similarity: 0.9 }),
      chunk({ chunkId: "c2", chunkIndex: 1, content: next, similarity: 0.85 }),
    ];

    const result = buildRagContext("consulta", results);

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].chunkIds).toEqual(["c1", "c2"]);
    // El fragmento solapado no debe repetirse en el contexto final.
    const occurrences = result.userPrompt.split(overlap).length - 1;
    expect(occurrences).toBe(1);
  });

  it("une con salto de línea cuando dos chunks del mismo artículo no comparten solape", () => {
    const results = [
      chunk({
        chunkId: "c1",
        chunkIndex: 0,
        content: "Primer fragmento sin relación textual alguna con el siguiente.",
        similarity: 0.9,
      }),
      chunk({
        chunkId: "c2",
        chunkIndex: 1,
        content: "Segundo fragmento completamente distinto y sin coincidencias.",
        similarity: 0.9,
      }),
    ];

    const result = buildRagContext("consulta", results);

    expect(result.userPrompt).toContain(
      "Primer fragmento sin relación textual alguna con el siguiente.\nSegundo fragmento completamente distinto y sin coincidencias.",
    );
  });

  it("ordena los documentos por similitud descendente y limita a maxDocuments", () => {
    const results = [
      chunk({ articleId: "low", articleTitle: "Low", similarity: 0.76 }),
      chunk({ articleId: "high", articleTitle: "High", similarity: 0.95, chunkId: "c2" }),
      chunk({ articleId: "mid", articleTitle: "Mid", similarity: 0.85, chunkId: "c3" }),
      chunk({ articleId: "extra", articleTitle: "Extra", similarity: 0.99, chunkId: "c4" }),
    ];

    const result = buildRagContext("consulta", results, { maxDocuments: 3 });

    expect(result.sources.map((s) => s.articleId)).toEqual(["extra", "high", "mid"]);
    expect(result.sources.map((s) => s.rank)).toEqual([1, 2, 3]);
  });

  it("respeta el presupuesto de caracteres pero siempre incluye al menos el primer documento", () => {
    const hugeContent = "x".repeat(5000);
    const results = [
      chunk({ articleId: "a", content: hugeContent, similarity: 0.95 }),
      chunk({
        articleId: "b",
        chunkId: "c2",
        content: "y".repeat(2000),
        similarity: 0.9,
      }),
    ];

    const result = buildRagContext("consulta", results, { maxContextChars: 1000 });

    // El primer documento por relevancia entra aunque él solo exceda el
    // presupuesto; el segundo se descarta por no caber ya.
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].articleId).toBe("a");
  });
});
