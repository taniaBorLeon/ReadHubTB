"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import {
  validateLoginForm,
  type FieldErrors,
} from "@/lib/validators/auth.validators";
import { LoginForm } from "@/components/forms/LoginForm";
import { ROUTES } from "@/lib/constants/routes";

function LoginPageContent() {
  const { login, error: authError } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    searchParams.get("loggedOut") ? "Sesión cerrada correctamente." : null,
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validateLoginForm({ email, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSuccessMessage(null);
    const success = await login({ email, password });
    setSubmitting(false);

    if (success) {
      setSuccessMessage("Inicio de sesión exitoso. Redirigiendo...");
      router.push(ROUTES.home);
      router.refresh();
    } else {
      setPassword("");
    }
  }

  return (
    <LoginForm
      email={email}
      password={password}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      fieldErrors={fieldErrors}
      authError={authError}
      successMessage={successMessage}
      submitting={submitting}
      onSubmit={handleSubmit}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
