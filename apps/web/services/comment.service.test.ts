import { describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@readhub/database/client", () => ({
  createClient: createClientMock,
}));

import { createComment, listComments } from "./comment.service";

describe("listComments", () => {
  it("devuelve los comentarios que responde la RPC", async () => {
    const comments = [{ id: "c1" }];
    const rpc = vi.fn(async () => ({ data: comments, error: null }));
    createClientMock.mockReturnValue({ rpc });

    const result = await listComments("article-1");

    expect(result).toBe(comments);
    expect(rpc).toHaveBeenCalledWith("list_comments_with_author", {
      p_article_id: "article-1",
    });
  });

  it("devuelve un array vacío cuando data es null", async () => {
    createClientMock.mockReturnValue({ rpc: vi.fn(async () => ({ data: null, error: null })) });

    const result = await listComments("article-1");

    expect(result).toEqual([]);
  });

  it("propaga el error de la RPC", async () => {
    const error = new Error("función no encontrada");
    createClientMock.mockReturnValue({ rpc: vi.fn(async () => ({ data: null, error })) });

    await expect(listComments("article-1")).rejects.toThrow(error);
  });
});

describe("createComment", () => {
  it("inserta el comentario con los datos recibidos", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const from = vi.fn(() => ({ insert }));
    createClientMock.mockReturnValue({ from });

    await createComment("article-1", "user-1", "Excelente artículo");

    expect(from).toHaveBeenCalledWith("comments");
    expect(insert).toHaveBeenCalledWith({
      article_id: "article-1",
      user_id: "user-1",
      comment: "Excelente artículo",
    });
  });

  it("lanza cuando la inserción falla", async () => {
    const error = new Error("comentario vacío rechazado por RLS");
    createClientMock.mockReturnValue({
      from: vi.fn(() => ({ insert: vi.fn(async () => ({ error })) })),
    });

    await expect(createComment("article-1", "user-1", "")).rejects.toThrow(error);
  });
});
