export type FieldErrors = Record<string, string>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RegisterFormValues {
  email: string;
  birthDate: string;
  phone: string;
  password: string;
}

export function validateRegisterForm(
  values: RegisterFormValues,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.email.trim()) {
    errors.email = "El correo electrónico es obligatorio.";
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Ingresa un correo electrónico válido.";
  }

  if (!values.birthDate) {
    errors.birthDate = "La fecha de nacimiento es obligatoria.";
  } else if (Number.isNaN(Date.parse(values.birthDate))) {
    errors.birthDate = "Ingresa una fecha válida.";
  } else if (new Date(values.birthDate) > new Date()) {
    errors.birthDate = "La fecha de nacimiento no puede ser futura.";
  }

  if (!values.phone.trim()) {
    errors.phone = "El número celular es obligatorio.";
  }

  if (!values.password) {
    errors.password = "La contraseña es obligatoria.";
  } else if (values.password.length < 8) {
    errors.password = "La contraseña debe tener al menos 8 caracteres.";
  }

  return errors;
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export function validateLoginForm(values: LoginFormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.email.trim()) {
    errors.email = "El correo electrónico es obligatorio.";
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Ingresa un correo electrónico válido.";
  }

  if (!values.password) {
    errors.password = "La contraseña es obligatoria.";
  }

  return errors;
}
