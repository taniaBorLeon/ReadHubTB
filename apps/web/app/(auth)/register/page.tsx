"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import {
  validateRegisterForm,
  type FieldErrors,
} from "@/lib/validators/auth.validators";
import { RegisterForm } from "@/components/forms/RegisterForm";
import { ROUTES } from "@/lib/constants/routes";

export default function RegisterPage() {
  const { register, error: authError } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validateRegisterForm({ email, birthDate, phone, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSuccessMessage(null);
    const result = await register({ email, birthDate, phone, password });
    setSubmitting(false);

    if (!result.success) return;

    if (result.requiresConfirmation) {
      setSuccessMessage(
        "Registro exitoso. Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.",
      );
      return;
    }

    setSuccessMessage("Registro exitoso. Redirigiendo...");
    router.push(ROUTES.home);
    router.refresh();
  }

  return (
    <RegisterForm
      email={email}
      birthDate={birthDate}
      phone={phone}
      password={password}
      onEmailChange={setEmail}
      onBirthDateChange={setBirthDate}
      onPhoneChange={setPhone}
      onPasswordChange={setPassword}
      fieldErrors={fieldErrors}
      authError={authError}
      successMessage={successMessage}
      submitting={submitting}
      onSubmit={handleSubmit}
    />
  );
}
