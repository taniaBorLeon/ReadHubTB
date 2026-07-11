import { describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@readhub/database/client", () => ({
  createClient: createClientMock,
}));

import { getArticleFilePublicUrl, uploadArticleFile } from "./storage.service";
import { ARTICLES_BUCKET } from "@readhub/shared/storage-constants";

describe("uploadArticleFile", () => {
  it("sube el archivo a una ruta con el id de usuario, un timestamp y el nombre saneado", async () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const upload = vi.fn(async () => ({ error: null }));
    const from = vi.fn(() => ({ upload }));
    createClientMock.mockReturnValue({ storage: { from } });

    const file = new File(["contenido"], "mi archivo (final).pdf", {
      type: "application/pdf",
    });

    const path = await uploadArticleFile("user-1", file);

    expect(from).toHaveBeenCalledWith(ARTICLES_BUCKET);
    expect(path).toBe(`user-1/${Date.now()}-mi-archivo--final-.pdf`);
    expect(upload).toHaveBeenCalledWith(path, file);

    vi.useRealTimers();
  });

  it("lanza cuando la subida falla", async () => {
    const error = new Error("bucket no encontrado");
    createClientMock.mockReturnValue({
      storage: { from: vi.fn(() => ({ upload: vi.fn(async () => ({ error })) })) },
    });

    const file = new File(["x"], "a.png", { type: "image/png" });

    await expect(uploadArticleFile("user-1", file)).rejects.toThrow(error);
  });
});

describe("getArticleFilePublicUrl", () => {
  it("construye la URL pública a partir de la ruta almacenada", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proyecto.supabase.co";

    const url = getArticleFilePublicUrl("user-1/123-archivo.pdf");

    expect(url).toBe(
      `https://proyecto.supabase.co/storage/v1/object/public/${ARTICLES_BUCKET}/user-1/123-archivo.pdf`,
    );
  });
});
