"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  subscribeToAuthChanges,
} from "@/services/auth.service";
import type {
  LoginFormValues,
  RegisterFormValues,
} from "@/lib/validators/auth.validators";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getCurrentUser().then((currentUser) => {
      if (active) {
        setUser(currentUser);
        setLoading(false);
      }
    });

    const unsubscribe = subscribeToAuthChanges((nextUser) => {
      setUser(nextUser);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (values: LoginFormValues) => {
    setError(null);
    try {
      const loggedUser = await loginUser(values);
      setUser(loggedUser);
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar sesión.",
      );
      return false;
    }
  }, []);

  const register = useCallback(async (values: RegisterFormValues) => {
    setError(null);
    try {
      const { user: newUser, session } = await registerUser(values);
      const requiresConfirmation = !session;
      if (!requiresConfirmation) {
        setUser(newUser);
      }
      return { success: true, requiresConfirmation };
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo completar el registro.",
      );
      return { success: false, requiresConfirmation: false };
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await logoutUser();
      setUser(null);
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cerrar la sesión.",
      );
      return false;
    }
  }, []);

  return { user, loading, error, login, register, logout };
}
