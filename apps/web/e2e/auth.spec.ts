import { expect, test } from "./fixtures/pages";
import { primaryTestUser } from "./data/users";
import { ROUTES } from "../lib/constants/routes";

/**
 * Flujo completo de autenticación contra la app real (Next.js + middleware +
 * Supabase reales, sin mocks ni atajos): abrir la app, terminar en Login vía
 * el middleware, autenticarse con credenciales válidas, aterrizar en el
 * Dashboard con los datos del usuario y la navegación cargados, cerrar
 * sesión y volver a Login.
 */
test.describe("Autenticación", () => {
  test("un usuario puede iniciar sesión, ver el dashboard y cerrar sesión", async ({
    page,
    loginPage,
    dashboardPage,
  }) => {
    // 1-2. Abrir la aplicación sin sesión: el middleware real redirige a
    // Login (no existe una landing pública distinta del propio dashboard).
    await page.goto("/");
    await loginPage.waitUntilLoaded();

    // 3-4. Ingresar credenciales válidas y autenticarse (Supabase real).
    await loginPage.login(primaryTestUser.email, primaryTestUser.password);

    // 5. Redirección real al Dashboard tras el login.
    await dashboardPage.waitUntilLoaded();

    // 6. La información del usuario se cargó de verdad (useAuth -> sesión
    // real de Supabase, no un estado simulado).
    await expect(dashboardPage.userEmail(primaryTestUser.email)).toBeVisible();

    // 7. La navegación principal del dashboard está disponible.
    await expect(dashboardPage.homeLink).toBeVisible();
    await expect(dashboardPage.uploadLink).toBeVisible();
    await expect(dashboardPage.assistantLink).toBeVisible();
    await expect(dashboardPage.logoutButton).toBeVisible();

    // 8. Cerrar sesión.
    await dashboardPage.logout();

    // 9. Regreso real a Login, con el mensaje de confirmación que solo
    // aparece cuando el logout completó su ciclo real (?loggedOut=1).
    await page.waitForURL(
      (url) => url.pathname === ROUTES.login && url.searchParams.get("loggedOut") === "1",
    );
    await expect(loginPage.alert).toContainText("Sesión cerrada correctamente.");
  });
});
