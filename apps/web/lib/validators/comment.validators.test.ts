import { describe, expect, it } from "vitest";

import { validateComment } from "./comment.validators";

describe("validateComment", () => {
  it("devuelve null para un comentario con contenido", () => {
    expect(validateComment("Muy buen artículo")).toBeNull();
  });

  it("rechaza un comentario vacío", () => {
    expect(validateComment("")).toBe("El comentario no puede estar vacío.");
  });

  it("rechaza un comentario que solo tiene espacios en blanco", () => {
    expect(validateComment("   \n\t  ")).toBe("El comentario no puede estar vacío.");
  });
});
