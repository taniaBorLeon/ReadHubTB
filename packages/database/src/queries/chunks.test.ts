import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getArticleChunks, getArticleFullContent } from "./chunks";
import type { Database } from "../database.types";

interface FakeQueryResult {
  data: unknown;
  error: unknown;
}

function fakeSupabase(result: FakeQueryResult) {
  const order = vi.fn(async () => result);
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { client: { from } as unknown as SupabaseClient<Database>, from, select, eq, order };
}

describe("getArticleChunks", () => {
  it("consulta article_chunks filtrando por articleId y ordenando por chunk_index", async () => {
    const rows = [
      { chunk_index: 0, content: "primero" },
      { chunk_index: 1, content: "segundo" },
    ];
    const { client, from, select, eq, order } = fakeSupabase({ data: rows, error: null });

    const result = await getArticleChunks(client, "article-1");

    expect(from).toHaveBeenCalledWith("article_chunks");
    expect(select).toHaveBeenCalledWith("chunk_index, content");
    expect(eq).toHaveBeenCalledWith("article_id", "article-1");
    expect(order).toHaveBeenCalledWith("chunk_index", { ascending: true });
    expect(result).toBe(rows);
  });

  it("devuelve un array vacío cuando data es null", async () => {
    const { client } = fakeSupabase({ data: null, error: null });

    const result = await getArticleChunks(client, "article-1");

    expect(result).toEqual([]);
  });

  it("propaga el error de Supabase", async () => {
    const error = new Error("tabla no encontrada");
    const { client } = fakeSupabase({ data: null, error });

    await expect(getArticleChunks(client, "article-1")).rejects.toThrow(error);
  });
});

describe("getArticleFullContent", () => {
  it("concatena el contenido de los chunks en orden separados por doble salto de línea", async () => {
    const rows = [
      { chunk_index: 0, content: "Primer fragmento." },
      { chunk_index: 1, content: "Segundo fragmento." },
    ];
    const { client } = fakeSupabase({ data: rows, error: null });

    const result = await getArticleFullContent(client, "article-1");

    expect(result).toBe("Primer fragmento.\n\nSegundo fragmento.");
  });

  it("devuelve una cadena vacía cuando el artículo no tiene chunks indexados", async () => {
    const { client } = fakeSupabase({ data: [], error: null });

    const result = await getArticleFullContent(client, "article-1");

    expect(result).toBe("");
  });
});
