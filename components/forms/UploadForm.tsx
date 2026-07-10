import type { FormEvent } from "react";

import type { FieldErrors } from "@/lib/validators/auth.validators";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface UploadFormProps {
  title: string;
  summary: string;
  onTitleChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onDocumentChange: (file: File | null) => void;
  onImageChange: (file: File | null) => void;
  errors: FieldErrors;
  uploading: boolean;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}

export function UploadForm({
  title,
  summary,
  onTitleChange,
  onSummaryChange,
  onDocumentChange,
  onImageChange,
  errors,
  uploading,
  onSubmit,
  onCancel,
}: UploadFormProps) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Publicar artículo</CardTitle>
        <CardDescription>
          Comparte un nuevo artículo con la comunidad.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          {errors.form && (
            <Alert variant="destructive">
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}
          <FormField htmlFor="title" label="Título" error={errors.title}>
            <Input
              id="title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Título del artículo"
            />
          </FormField>
          <FormField htmlFor="summary" label="Resumen (opcional)">
            <Textarea
              id="summary"
              value={summary}
              onChange={(event) => onSummaryChange(event.target.value)}
              placeholder="Breve resumen del contenido"
            />
          </FormField>
          <FormField
            htmlFor="document"
            label="Documento (TXT, DOCX o PDF)"
            error={errors.documentFile}
          >
            <Input
              id="document"
              type="file"
              accept=".txt,.docx,.pdf"
              onChange={(event) =>
                onDocumentChange(event.target.files?.[0] ?? null)
              }
            />
          </FormField>
          <FormField
            htmlFor="image"
            label="Imagen de portada"
            error={errors.imageFile}
          >
            <Input
              id="image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) =>
                onImageChange(event.target.files?.[0] ?? null)
              }
            />
          </FormField>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={uploading} className="sm:w-auto">
            {uploading ? "Publicando..." : "Publicar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="sm:w-auto"
          >
            Cancelar
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
