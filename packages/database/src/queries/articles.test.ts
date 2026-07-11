import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getArticleWithStats,
  listArticlesWithStats,
  searchArticlesByKeyword,
} from "./articles";
import type { Database } from "../database.types";

type ArticleRow =
  Database["public"]["Functions"]["list_articles_with_stats"]["Returns"][number];

function fakeSupabase(rpcImpl: (fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>) {
  return { rpc: vi.fn(rpcImpl) } as unknown as SupabaseClient<Database>;
}

function article(overrides: Partial<ArticleRow> = {}): ArticleRow {
  return {
    id: "article-1",
    author_id: "author-1",
    author_email: "autor@example.com",
    title: "Título de ejemplo",
    summary: "Un resumen cualquiera",
    document_path: "doc.pdf",
    image_path: "img.png",
    created_at: "2026-01-01T00:00:00Z",
    views_count: 0,
    likes_count: 0,
    ...overrides,
  } as ArticleRow;
}

describe("listArticlesWithStats", () => {
  it("devuelve los datos que responde la RPC", async () => {
    const rows = [article()];
    const supabase = fakeSupabase(async () => ({ data: rows, error: null }));

    const result = await listArticlesWithStats(supabase);

    expect(result).toBe(rows);
    expect(supabase.rpc).toHaveBeenCalledWith("list_articles_with_stats");
  });

  it("devuelve un array vacío cuando data es null", async () => {
    const supabase = fakeSupabase(async () => ({ data: null, error: null }));

    const result = await listArticlesWithStats(supabase);

    expect(result).toEqual([]);
  });

  it("propaga el error de la RPC", async () => {
    const error = new Error("fallo de red");
    const supabase = fakeSupabase(async () => ({ data: null, error }));

    await expect(listArticlesWithStats(supabase)).rejects.toThrow(error);
  });
});

describe("getArticleWithStats", () => {
  it("devuelve el primer elemento del array de resultado", async () => {
    const row = article({ id: "article-2" });
    const supabase = fakeSupabase(async (fn, args) => {
      expect(fn).toBe("get_article_with_stats");
      expect(args).toEqual({ p_article_id: "article-2" });
      return { data: [row], error: null };
    });

    const result = await getArticleWithStats(supabase, "article-2");

    expect(result).toBe(row);
  });

  it("devuelve null cuando la RPC no encuentra el artículo", async () => {
    const supabase = fakeSupabase(async () => ({ data: [], error: null }));

    const result = await getArticleWithStats(supabase, "inexistente");

    expect(result).toBeNull();
  });

  it("devuelve null cuando data es null", async () => {
    const supabase = fakeSupabase(async () => ({ data: null, error: null }));

    const result = await getArticleWithStats(supabase, "inexistente");

    expect(result).toBeNull();
  });

  it("propaga el error de la RPC", async () => {
    const error = new Error("no autorizado");
    const supabase = fakeSupabase(async () => ({ data: null, error }));

    await expect(getArticleWithStats(supabase, "x")).rejects.toThrow(error);
  });
});

describe("searchArticlesByKeyword", () => {
  it("devuelve un array vacío sin consultar Supabase para una query vacía", async () => {
    const supabase = fakeSupabase(async () => ({ data: [], error: null }));

    const result = await searchArticlesByKeyword(supabase, "   ");

    expect(result).toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("filtra por título de forma insensible a mayúsculas", async () => {
    const rows = [
      article({ id: "a", title: "Introducción a TypeScript" }),
      article({ id: "b", title: "Cocina vegana" }),
    ];
    const supabase = fakeSupabase(async () => ({ data: rows, error: null }));

    const result = await searchArticlesByKeyword(supabase, "typescript");

    expect(result.map((a) => a.id)).toEqual(["a"]);
  });

  it("filtra por resumen cuando el título no coincide", async () => {
    const rows = [
      article({ id: "a", title: "Otro título", summary: "Habla sobre pgvector y RAG" }),
    ];
    const supabase = fakeSupabase(async () => ({ data: rows, error: null }));

    const result = await searchArticlesByKeyword(supabase, "pgvector");

    expect(result.map((a) => a.id)).toEqual(["a"]);
  });

  it("no lanza cuando un artículo tiene summary null", async () => {
    const rows = [article({ id: "a", title: "Sin resumen", summary: null })];
    const supabase = fakeSupabase(async () => ({ data: rows, error: null }));

    const result = await searchArticlesByKeyword(supabase, "resumen");

    expect(result.map((a) => a.id)).toEqual(["a"]);
  });

  it("devuelve un array vacío cuando ningún artículo coincide", async () => {
    const rows = [article({ title: "Nada que ver" })];
    const supabase = fakeSupabase(async () => ({ data: rows, error: null }));

    const result = await searchArticlesByKeyword(supabase, "inexistente");

    expect(result).toEqual([]);
  });
});
