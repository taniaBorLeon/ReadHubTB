import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, listArticlesWithStatsMock, getArticleWithStatsMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  listArticlesWithStatsMock: vi.fn(),
  getArticleWithStatsMock: vi.fn(),
}));

vi.mock("@readhub/database/client", () => ({
  createClient: createClientMock,
}));

vi.mock("@readhub/database/queries/articles", () => ({
  listArticlesWithStats: listArticlesWithStatsMock,
  getArticleWithStats: getArticleWithStatsMock,
}));

import {
  createArticle,
  getArticle,
  listArticles,
  registerView,
  toggleLike,
} from "./article.service";

describe("listArticles / getArticle", () => {
  const supabase = { marker: "fake-client" };

  beforeEach(() => {
    createClientMock.mockReturnValue(supabase);
  });

  it("listArticles delega en listArticlesWithStats con el cliente del navegador", async () => {
    const articles = [{ id: "a" }];
    listArticlesWithStatsMock.mockResolvedValue(articles);

    const result = await listArticles();

    expect(result).toBe(articles);
    expect(listArticlesWithStatsMock).toHaveBeenCalledWith(supabase);
  });

  it("getArticle delega en getArticleWithStats con el id recibido", async () => {
    const detail = { id: "a" };
    getArticleWithStatsMock.mockResolvedValue(detail);

    const result = await getArticle("a");

    expect(result).toBe(detail);
    expect(getArticleWithStatsMock).toHaveBeenCalledWith(supabase, "a");
  });
});

describe("createArticle", () => {
  const singleMock = vi.fn();
  const selectMock = vi.fn(() => ({ single: singleMock }));
  const insertMock = vi.fn(() => ({ select: selectMock }));
  const fromMock = vi.fn(() => ({ insert: insertMock }));

  beforeEach(() => {
    createClientMock.mockReturnValue({ from: fromMock });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("inserta el artículo y devuelve la fila creada", async () => {
    const inserted = { id: "new-article" };
    singleMock.mockResolvedValue({ data: inserted, error: null });

    const result = await createArticle({
      authorId: "author-1",
      title: "Título",
      summary: "Resumen",
      documentPath: "doc.pdf",
      imagePath: "img.png",
    });

    expect(result).toBe(inserted);
    expect(fromMock).toHaveBeenCalledWith("articles");
    expect(insertMock).toHaveBeenCalledWith({
      author_id: "author-1",
      title: "Título",
      summary: "Resumen",
      document_path: "doc.pdf",
      image_path: "img.png",
    });
  });

  it("dispara la indexación del artículo recién creado sin bloquear la publicación", async () => {
    singleMock.mockResolvedValue({ data: { id: "new-article" }, error: null });

    await createArticle({
      authorId: "author-1",
      title: "Título",
      summary: null,
      documentPath: "doc.pdf",
      imagePath: "img.png",
    });

    expect(fetch).toHaveBeenCalledWith("/api/articles/new-article/index", {
      method: "POST",
      keepalive: true,
    });
  });

  it("no lanza aunque falle la petición de indexación (fire-and-forget)", async () => {
    singleMock.mockResolvedValue({ data: { id: "new-article" }, error: null });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(
      createArticle({
        authorId: "author-1",
        title: "Título",
        summary: null,
        documentPath: "doc.pdf",
        imagePath: "img.png",
      }),
    ).resolves.toBeDefined();
  });

  it("lanza cuando falla la inserción", async () => {
    const error = new Error("violación de restricción");
    singleMock.mockResolvedValue({ data: null, error });

    await expect(
      createArticle({
        authorId: "author-1",
        title: "Título",
        summary: null,
        documentPath: "doc.pdf",
        imagePath: "img.png",
      }),
    ).rejects.toThrow(error);

    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("registerView", () => {
  it("inserta la vista para el artículo y usuario dados", async () => {
    const insertMock = vi.fn(async () => ({ error: null }));
    const fromMock = vi.fn(() => ({ insert: insertMock }));
    createClientMock.mockReturnValue({ from: fromMock });

    await registerView("article-1", "user-1");

    expect(fromMock).toHaveBeenCalledWith("views");
    expect(insertMock).toHaveBeenCalledWith({
      article_id: "article-1",
      user_id: "user-1",
    });
  });

  it("lanza cuando falla la inserción", async () => {
    const error = new Error("fallo de RLS");
    const insertMock = vi.fn(async () => ({ error }));
    createClientMock.mockReturnValue({ from: () => ({ insert: insertMock }) });

    await expect(registerView("article-1", "user-1")).rejects.toThrow(error);
  });
});

describe("toggleLike", () => {
  it("devuelve true cuando el insert de like tiene éxito (primer like)", async () => {
    const insertMock = vi.fn(async () => ({ error: null }));
    const fromMock = vi.fn(() => ({ insert: insertMock }));
    createClientMock.mockReturnValue({ from: fromMock });

    const result = await toggleLike("article-1", "user-1");

    expect(result).toBe(true);
    expect(insertMock).toHaveBeenCalledWith({
      article_id: "article-1",
      user_id: "user-1",
    });
  });

  it("elimina el like existente y devuelve false cuando el insert choca con la restricción única (23505)", async () => {
    const insertMock = vi.fn(async () => ({ error: { code: "23505" } }));
    const eq2 = vi.fn(async () => ({ error: null }));
    const eq1 = vi.fn(() => ({ eq: eq2 }));
    const deleteMock = vi.fn(() => ({ eq: eq1 }));
    const fromMock = vi.fn(() => ({ insert: insertMock, delete: deleteMock }));
    createClientMock.mockReturnValue({ from: fromMock });

    const result = await toggleLike("article-1", "user-1");

    expect(result).toBe(false);
    expect(eq1).toHaveBeenCalledWith("article_id", "article-1");
    expect(eq2).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("lanza si falla el delete tras un conflicto 23505", async () => {
    const deleteError = new Error("no se pudo eliminar");
    const insertMock = vi.fn(async () => ({ error: { code: "23505" } }));
    const eq2 = vi.fn(async () => ({ error: deleteError }));
    const eq1 = vi.fn(() => ({ eq: eq2 }));
    const deleteMock = vi.fn(() => ({ eq: eq1 }));
    createClientMock.mockReturnValue({
      from: () => ({ insert: insertMock, delete: deleteMock }),
    });

    await expect(toggleLike("article-1", "user-1")).rejects.toThrow(deleteError);
  });

  it("lanza cuando el insert falla por un motivo distinto de 23505", async () => {
    const insertError = { code: "500", message: "error inesperado" };
    const insertMock = vi.fn(async () => ({ error: insertError }));
    createClientMock.mockReturnValue({ from: () => ({ insert: insertMock }) });

    await expect(toggleLike("article-1", "user-1")).rejects.toBe(insertError);
  });
});
