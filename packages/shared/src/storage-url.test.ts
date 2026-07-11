import { afterEach, describe, expect, it } from "vitest";

import { getPublicStorageUrl } from "./storage-url";
import { ARTICLES_BUCKET } from "./storage.constants";

describe("getPublicStorageUrl", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  });

  it("construye la URL pública combinando la base, el bucket y la ruta", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proyecto.supabase.co";

    const url = getPublicStorageUrl("user-1/1234-imagen.png");

    expect(url).toBe(
      `https://proyecto.supabase.co/storage/v1/object/public/${ARTICLES_BUCKET}/user-1/1234-imagen.png`,
    );
  });

  it("usa una base vacía cuando la variable de entorno no está definida", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const url = getPublicStorageUrl("ruta.pdf");

    expect(url).toBe(`/storage/v1/object/public/${ARTICLES_BUCKET}/ruta.pdf`);
  });

  it("no lanza con una ruta vacía", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proyecto.supabase.co";

    expect(() => getPublicStorageUrl("")).not.toThrow();
  });
});
