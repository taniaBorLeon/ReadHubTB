import { envOrDefault } from "../utils/env";

export interface E2ECredentials {
  email: string;
  password: string;
}

/**
 * Usuario de prueba para los E2E de autenticación. Por defecto usa el
 * fixture ya versionado en supabase/seed.sql ("Contraseña de todos los
 * usuarios de prueba: ReadHub123!" -- mismo dato documentado ahí), que debe
 * existir realmente en el proyecto de Supabase contra el que corran estos
 * tests (local vía `supabase db reset`, o sembrado igual en un proyecto de
 * pruebas dedicado). Sobreescribible con E2E_USER_EMAIL/E2E_USER_PASSWORD
 * para apuntar a otro entorno sin tocar el código de los specs.
 */
export const primaryTestUser: E2ECredentials = {
  email: envOrDefault("E2E_USER_EMAIL", "reader1@readhub.test"),
  password: envOrDefault("E2E_USER_PASSWORD", "ReadHub123!"),
};
