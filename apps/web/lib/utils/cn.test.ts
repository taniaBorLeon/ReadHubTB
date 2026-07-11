import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("combina varias clases en un único string", () => {
    expect(cn("flex", "items-center")).toBe("flex items-center");
  });

  it("ignora valores falsy (uso típico con clases condicionales)", () => {
    expect(cn("base", false && "oculto", undefined, null, "activo")).toBe("base activo");
  });

  it("resuelve conflictos de Tailwind quedándose con la última clase en conflicto", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("devuelve una cadena vacía sin argumentos", () => {
    expect(cn()).toBe("");
  });
});
