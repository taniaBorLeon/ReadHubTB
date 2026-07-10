import {
  ALLOWED_DOCUMENT_EXTENSIONS,
  ALLOWED_IMAGE_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
} from "@readhub/shared/storage-constants";
import type { FieldErrors } from "@/lib/validators/auth.validators";

export interface ArticleFormValues {
  title: string;
  documentFile: File | null;
  imageFile: File | null;
}

function hasAllowedExtension(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

export function validateArticleForm(values: ArticleFormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.title.trim()) {
    errors.title = "El título no puede estar vacío.";
  }

  if (!values.documentFile) {
    errors.documentFile = "Debes seleccionar un documento.";
  } else if (!hasAllowedExtension(values.documentFile.name)) {
    errors.documentFile = "El documento debe tener formato TXT, DOCX o PDF.";
  } else if (values.documentFile.size > MAX_DOCUMENT_SIZE_BYTES) {
    errors.documentFile = "El documento supera el tamaño máximo permitido (10MB).";
  }

  if (!values.imageFile) {
    errors.imageFile = "Debes seleccionar una imagen de portada.";
  } else if (
    !ALLOWED_IMAGE_TYPES.includes(
      values.imageFile.type as (typeof ALLOWED_IMAGE_TYPES)[number],
    )
  ) {
    errors.imageFile = "La imagen debe tener formato PNG, JPG o WEBP.";
  } else if (values.imageFile.size > MAX_IMAGE_SIZE_BYTES) {
    errors.imageFile = "La imagen supera el tamaño máximo permitido (5MB).";
  }

  return errors;
}
