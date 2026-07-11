import { describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@readhub/database/client", () => ({
  createClient: createClientMock,
}));

import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  subscribeToAuthChanges,
} from "./auth.service";

describe("registerUser", () => {
  it("actualiza el perfil cuando el registro devuelve una sesión activa", async () => {
    const updateEq = vi.fn(async () => ({ error: null }));
    const update = vi.fn(() => ({ eq: updateEq }));
    const signUp = vi.fn(async () => ({
      data: {
        user: { id: "user-1" },
        session: { access_token: "token" },
      },
      error: null,
    }));
    createClientMock.mockReturnValue({
      auth: { signUp },
      from: vi.fn(() => ({ update })),
    });

    const result = await registerUser({
      email: "user@example.com",
      password: "12345678",
      birthDate: "2000-01-01",
      phone: "0999999999",
    });

    expect(result.user).toEqual({ id: "user-1" });
    expect(update).toHaveBeenCalledWith({ birth_date: "2000-01-01", phone: "0999999999" });
    expect(updateEq).toHaveBeenCalledWith("id", "user-1");
  });

  it("no intenta actualizar el perfil cuando no hay sesión activa (confirmación de correo pendiente)", async () => {
    const update = vi.fn();
    const signUp = vi.fn(async () => ({
      data: { user: { id: "user-1" }, session: null },
      error: null,
    }));
    createClientMock.mockReturnValue({
      auth: { signUp },
      from: vi.fn(() => ({ update })),
    });

    const result = await registerUser({
      email: "user@example.com",
      password: "12345678",
      birthDate: "2000-01-01",
      phone: "0999999999",
    });

    expect(result.session).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it("lanza cuando signUp devuelve error", async () => {
    const error = new Error("correo ya registrado");
    createClientMock.mockReturnValue({
      auth: { signUp: vi.fn(async () => ({ data: {}, error })) },
    });

    await expect(
      registerUser({
        email: "user@example.com",
        password: "12345678",
        birthDate: "2000-01-01",
        phone: "0999999999",
      }),
    ).rejects.toThrow(error);
  });

  it("lanza cuando la actualización del perfil falla", async () => {
    const profileError = new Error("no se pudo actualizar el perfil");
    createClientMock.mockReturnValue({
      auth: {
        signUp: vi.fn(async () => ({
          data: { user: { id: "user-1" }, session: { access_token: "t" } },
          error: null,
        })),
      },
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: profileError })) })),
      })),
    });

    await expect(
      registerUser({
        email: "user@example.com",
        password: "12345678",
        birthDate: "2000-01-01",
        phone: "0999999999",
      }),
    ).rejects.toThrow(profileError);
  });
});

describe("loginUser", () => {
  it("devuelve el usuario autenticado", async () => {
    const user = { id: "user-1" };
    createClientMock.mockReturnValue({
      auth: {
        signInWithPassword: vi.fn(async () => ({ data: { user }, error: null })),
      },
    });

    const result = await loginUser({ email: "user@example.com", password: "secreto" });

    expect(result).toBe(user);
  });

  it("lanza con credenciales inválidas", async () => {
    const error = new Error("credenciales inválidas");
    createClientMock.mockReturnValue({
      auth: {
        signInWithPassword: vi.fn(async () => ({ data: { user: null }, error })),
      },
    });

    await expect(
      loginUser({ email: "user@example.com", password: "mala" }),
    ).rejects.toThrow(error);
  });
});

describe("logoutUser", () => {
  it("resuelve sin lanzar cuando signOut tiene éxito", async () => {
    createClientMock.mockReturnValue({
      auth: { signOut: vi.fn(async () => ({ error: null })) },
    });

    await expect(logoutUser()).resolves.toBeUndefined();
  });

  it("lanza cuando signOut falla", async () => {
    const error = new Error("sesión ya cerrada");
    createClientMock.mockReturnValue({
      auth: { signOut: vi.fn(async () => ({ error })) },
    });

    await expect(logoutUser()).rejects.toThrow(error);
  });
});

describe("getCurrentUser", () => {
  it("devuelve el usuario actual", async () => {
    const user = { id: "user-1" };
    createClientMock.mockReturnValue({
      auth: { getUser: vi.fn(async () => ({ data: { user }, error: null })) },
    });

    const result = await getCurrentUser();

    expect(result).toBe(user);
  });

  it("devuelve null (no lanza) cuando getUser falla", async () => {
    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null }, error: new Error("sin sesión") })),
      },
    });

    await expect(getCurrentUser()).resolves.toBeNull();
  });
});

describe("subscribeToAuthChanges", () => {
  it("invoca el callback con el usuario de la sesión emitida", () => {
    let capturedHandler: ((event: string, session: unknown) => void) | undefined;
    const unsubscribe = vi.fn();
    createClientMock.mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn((handler) => {
          capturedHandler = handler;
          return { data: { subscription: { unsubscribe } } };
        }),
      },
    });

    const callback = vi.fn();
    subscribeToAuthChanges(callback);

    capturedHandler?.("SIGNED_IN", { user: { id: "user-1" } });
    expect(callback).toHaveBeenCalledWith({ id: "user-1" });

    capturedHandler?.("SIGNED_OUT", null);
    expect(callback).toHaveBeenCalledWith(null);
  });

  it("la función devuelta cancela la suscripción", () => {
    const unsubscribe = vi.fn();
    createClientMock.mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe } } })),
      },
    });

    const stop = subscribeToAuthChanges(vi.fn());
    stop();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
