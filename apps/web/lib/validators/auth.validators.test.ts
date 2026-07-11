import { describe, expect, it } from "vitest";

import { validateLoginForm, validateRegisterForm } from "./auth.validators";

describe("validateLoginForm", () => {
  it("no devuelve errores con datos válidos", () => {
    const errors = validateLoginForm({ email: "user@example.com", password: "secreto" });
    expect(errors).toEqual({});
  });

  it("exige el correo electrónico", () => {
    const errors = validateLoginForm({ email: "  ", password: "secreto" });
    expect(errors.email).toBe("El correo electrónico es obligatorio.");
  });

  it("rechaza un correo con formato inválido", () => {
    const errors = validateLoginForm({ email: "no-es-un-correo", password: "secreto" });
    expect(errors.email).toBe("Ingresa un correo electrónico válido.");
  });

  it("exige la contraseña", () => {
    const errors = validateLoginForm({ email: "user@example.com", password: "" });
    expect(errors.password).toBe("La contraseña es obligatoria.");
  });

  it("no aplica el mínimo de longitud de validateRegisterForm al login", () => {
    const errors = validateLoginForm({ email: "user@example.com", password: "123" });
    expect(errors.password).toBeUndefined();
  });
});

describe("validateRegisterForm", () => {
  const validValues = {
    email: "user@example.com",
    birthDate: "2000-01-01",
    phone: "0999999999",
    password: "12345678",
  };

  it("no devuelve errores con datos válidos", () => {
    expect(validateRegisterForm(validValues)).toEqual({});
  });

  it("exige el correo electrónico", () => {
    const errors = validateRegisterForm({ ...validValues, email: "" });
    expect(errors.email).toBe("El correo electrónico es obligatorio.");
  });

  it("rechaza un correo con formato inválido", () => {
    const errors = validateRegisterForm({ ...validValues, email: "invalido@" });
    expect(errors.email).toBe("Ingresa un correo electrónico válido.");
  });

  it("exige la fecha de nacimiento", () => {
    const errors = validateRegisterForm({ ...validValues, birthDate: "" });
    expect(errors.birthDate).toBe("La fecha de nacimiento es obligatoria.");
  });

  it("rechaza una fecha de nacimiento no parseable", () => {
    const errors = validateRegisterForm({ ...validValues, birthDate: "no-es-una-fecha" });
    expect(errors.birthDate).toBe("Ingresa una fecha válida.");
  });

  it("rechaza una fecha de nacimiento futura", () => {
    const futureYear = new Date().getFullYear() + 5;
    const errors = validateRegisterForm({ ...validValues, birthDate: `${futureYear}-01-01` });
    expect(errors.birthDate).toBe("La fecha de nacimiento no puede ser futura.");
  });

  it("exige el número celular", () => {
    const errors = validateRegisterForm({ ...validValues, phone: "  " });
    expect(errors.phone).toBe("El número celular es obligatorio.");
  });

  it("exige la contraseña", () => {
    const errors = validateRegisterForm({ ...validValues, password: "" });
    expect(errors.password).toBe("La contraseña es obligatoria.");
  });

  it("rechaza una contraseña más corta que 8 caracteres", () => {
    const errors = validateRegisterForm({ ...validValues, password: "1234567" });
    expect(errors.password).toBe("La contraseña debe tener al menos 8 caracteres.");
  });

  it("acumula varios errores a la vez", () => {
    const errors = validateRegisterForm({
      email: "",
      birthDate: "",
      phone: "",
      password: "",
    });
    expect(Object.keys(errors).sort()).toEqual(
      ["birthDate", "email", "password", "phone"].sort(),
    );
  });
});
