import type { Session, User } from "@supabase/supabase-js";

import { createClient } from "@readhub/database/client";

export interface RegisterInput {
  email: string;
  password: string;
  birthDate: string;
  phone: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterResult {
  user: User | null;
  session: Session | null;
}

export async function registerUser({
  email,
  password,
  birthDate,
  phone,
}: RegisterInput): Promise<RegisterResult> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  // Sin sesión activa (confirmación de correo pendiente en el proyecto de
  // Supabase) las políticas RLS de "profiles" bloquean el update: no hay
  // auth.uid() todavía. Solo se completa el perfil si ya existe sesión.
  if (data.session && data.user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ birth_date: birthDate, phone })
      .eq("id", data.user.id);
    if (profileError) throw profileError;
  }

  return { user: data.user, session: data.session };
}

export async function loginUser({
  email,
  password,
}: LoginInput): Promise<User | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.user;
}

export async function logoutUser(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export function subscribeToAuthChanges(
  callback: (user: User | null) => void,
): () => void {
  const supabase = createClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}
