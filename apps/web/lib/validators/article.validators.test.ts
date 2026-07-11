import { describe, expect, it } from "vitest";

import { validateArticleForm, type ArticleFormValues } from "./article.validators";
import {
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
} from "@readhub/shared/storage-constants";

function makeFile(name: string, type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

function validValues(): ArticleFormValues {
  return {
    title: "Un título válido",
    documentFile: makeFile("articulo.pdf", "application/pdf", 1024),
    imageFile: makeFile("portada.png", "image/png", 1024),
  };
}

describe("validateArticleForm", () => {
  it("no devuelve errores con datos válidos", () => {
    expect(validateArticleForm(validValues())).toEqual({});
  });

  it("exige un título no vacío", () => {
    const errors = validateArticleForm({ ...validValues(), title: "   " });
    expect(errors.title).toBe("El título no puede estar vacío.");
  });

  it("exige un documento", () => {
    const errors = validateArticleForm({ ...validValues(), documentFile: null });
    expect(errors.documentFile).toBe("Debes seleccionar un documento.");
  });

  it("rechaza un documento con extensión no permitida", () => {
    const errors = validateArticleForm({
      ...validValues(),
      documentFile: makeFile("articulo.exe", "application/octet-stream", 1024),
    });
    expect(errors.documentFile).toBe(
      "El documento debe tener formato TXT, DOCX o PDF.",
    );
  });

  it("acepta las extensiones de documento permitidas (case-insensitive)", () => {
    for (const name of ["a.TXT", "a.docx", "a.PDF"]) {
      const errors = validateArticleForm({
        ...validValues(),
        documentFile: makeFile(name, "application/octet-stream", 1024),
      });
      expect(errors.documentFile).toBeUndefined();
    }
  });

  it("rechaza un documento que supera el tamaño máximo", () => {
    const errors = validateArticleForm({
      ...validValues(),
      documentFile: makeFile("articulo.pdf", "application/pdf", MAX_DOCUMENT_SIZE_BYTES + 1),
    });
    expect(errors.documentFile).toBe(
      "El documento supera el tamaño máximo permitido (10MB).",
    );
  });

  it("acepta un documento exactamente en el límite de tamaño", () => {
    const errors = validateArticleForm({
      ...validValues(),
      documentFile: makeFile("articulo.pdf", "application/pdf", MAX_DOCUMENT_SIZE_BYTES),
    });
    expect(errors.documentFile).toBeUndefined();
  });

  it("exige una imagen de portada", () => {
    const errors = validateArticleForm({ ...validValues(), imageFile: null });
    expect(errors.imageFile).toBe("Debes seleccionar una imagen de portada.");
  });

  it("rechaza una imagen con tipo MIME no permitido", () => {
    const errors = validateArticleForm({
      ...validValues(),
      imageFile: makeFile("portada.gif", "image/gif", 1024),
    });
    expect(errors.imageFile).toBe("La imagen debe tener formato PNG, JPG o WEBP.");
  });

  it("rechaza una imagen que supera el tamaño máximo", () => {
    const errors = validateArticleForm({
      ...validValues(),
      imageFile: makeFile("portada.png", "image/png", MAX_IMAGE_SIZE_BYTES + 1),
    });
    expect(errors.imageFile).toBe(
      "La imagen supera el tamaño máximo permitido (5MB).",
    );
  });

  it("acumula errores de título, documento e imagen a la vez", () => {
    const errors = validateArticleForm({
      title: "",
      documentFile: null,
      imageFile: null,
    });
    expect(Object.keys(errors).sort()).toEqual(
      ["documentFile", "imageFile", "title"].sort(),
    );
  });
});
