import Link from "next/link";
import type { FormEvent } from "react";

import type { FieldErrors } from "@/lib/validators/auth.validators";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";

export interface RegisterFormProps {
  email: string;
  birthDate: string;
  phone: string;
  password: string;
  onEmailChange: (value: string) => void;
  onBirthDateChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  fieldErrors: FieldErrors;
  authError?: string | null;
  successMessage?: string | null;
  submitting: boolean;
  onSubmit: (event: FormEvent) => void;
}

export function RegisterForm({
  email,
  birthDate,
  phone,
  password,
  onEmailChange,
  onBirthDateChange,
  onPhoneChange,
  onPasswordChange,
  fieldErrors,
  authError,
  successMessage,
  submitting,
  onSubmit,
}: RegisterFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>
          Completa tus datos para unirte a ReadHub.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          {authError && (
            <Alert variant="destructive">
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert variant="success">
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
          <FormField
            htmlFor="email"
            label="Correo electrónico"
            error={fieldErrors.email}
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="tu@email.com"
            />
          </FormField>
          <FormField
            htmlFor="birthDate"
            label="Fecha de nacimiento"
            error={fieldErrors.birthDate}
          >
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(event) => onBirthDateChange(event.target.value)}
            />
          </FormField>
          <FormField
            htmlFor="phone"
            label="Número celular"
            error={fieldErrors.phone}
          >
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
              placeholder="3001234567"
            />
          </FormField>
          <FormField
            htmlFor="password"
            label="Contraseña"
            error={fieldErrors.password}
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="••••••••"
            />
          </FormField>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creando cuenta..." : "Registrarse"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link
              href={ROUTES.login}
              className="font-medium text-primary hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
