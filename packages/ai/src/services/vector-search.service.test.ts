import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateEmbeddingMock, createServiceRoleClientMock, rpcMock } = vi.hoisted(() => ({
  generateEmbeddingMock: vi.fn(),
  createServiceRoleClientMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock("../embeddings", () => ({
  generateEmbedding: generateEmbeddingMock,
}));

vi.mock("@readhub/database/service-role", () => ({
  createServiceRoleClient: createServiceRoleClientMock,
}));

import { searchRelevantChunks } from "./vector-search.service";
import { DEFAULT_MATCH_COUNT, DEFAULT_MIN_SIMILARITY } from "../constants";

describe("searchRelevantChunks", () => {
  beforeEach(() => {
    createServiceRoleClientMock.mockReturnValue({ rpc: rpcMock });
  });

  it("devuelve un array vacío sin llamar al proveedor de embeddings ni a Supabase para una consulta vacía", async () => {
    const results = await searchRelevantChunks("   ");

    expect(results).toEqual([]);
    expect(generateEmbeddingMock).not.toHaveBeenCalled();
    expect(createServiceRoleClientMock).not.toHaveBeenCalled();
  });

  it("recorta espacios de la consulta antes de generar el embedding", async () => {
    generateEmbeddingMock.mockResolvedValue([0.1, 0.2]);
    rpcMock.mockResolvedValue({ data: [], error: null });

    await searchRelevantChunks("  ¿qué es ReadHub?  ");

    expect(generateEmbeddingMock).toHaveBeenCalledWith("¿qué es ReadHub?");
  });

  it("usa los valores por defecto de matchCount y minSimilarity cuando no se pasan opciones", async () => {
    generateEmbeddingMock.mockResolvedValue([0.1, 0.2]);
    rpcMock.mockResolvedValue({ data: [], error: null });

    await searchRelevantChunks("consulta");

    expect(rpcMock).toHaveBeenCalledWith("match_article_chunks", {
      p_query_embedding: [0.1, 0.2],
      p_match_count: DEFAULT_MATCH_COUNT,
      p_min_similarity: DEFAULT_MIN_SIMILARITY,
    });
  });

  it("pasa matchCount y minSimilarity personalizados a la función RPC", async () => {
    generateEmbeddingMock.mockResolvedValue([0.1, 0.2]);
    rpcMock.mockResolvedValue({ data: [], error: null });

    await searchRelevantChunks("consulta", { matchCount: 10, minSimilarity: 0.5 });

    expect(rpcMock).toHaveBeenCalledWith("match_article_chunks", {
      p_query_embedding: [0.1, 0.2],
      p_match_count: 10,
      p_min_similarity: 0.5,
    });
  });

  it("mapea las filas de snake_case a camelCase", async () => {
    generateEmbeddingMock.mockResolvedValue([0.1, 0.2]);
    rpcMock.mockResolvedValue({
      data: [
        {
          chunk_id: "chunk-1",
          article_id: "article-1",
          article_title: "Título",
          chunk_index: 2,
          content: "contenido",
          similarity: 0.87,
        },
      ],
      error: null,
    });

    const results = await searchRelevantChunks("consulta");

    expect(results).toEqual([
      {
        chunkId: "chunk-1",
        articleId: "article-1",
        articleTitle: "Título",
        chunkIndex: 2,
        content: "contenido",
        similarity: 0.87,
      },
    ]);
  });

  it("devuelve un array vacío cuando Supabase responde con data null", async () => {
    generateEmbeddingMock.mockResolvedValue([0.1, 0.2]);
    rpcMock.mockResolvedValue({ data: null, error: null });

    const results = await searchRelevantChunks("consulta");

    expect(results).toEqual([]);
  });

  it("propaga el error cuando la llamada RPC falla", async () => {
    generateEmbeddingMock.mockResolvedValue([0.1, 0.2]);
    const rpcError = new Error("función no encontrada");
    rpcMock.mockResolvedValue({ data: null, error: rpcError });

    await expect(searchRelevantChunks("consulta")).rejects.toThrow(rpcError);
  });
});
