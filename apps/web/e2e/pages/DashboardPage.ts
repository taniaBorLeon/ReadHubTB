import type { Locator, Page } from "@playwright/test";

import { ROUTES } from "../../lib/constants/routes";

/**
 * Representa el layout compartido del dashboard (Navbar + contenido), no una
 * página concreta: es lo que aparece en cualquier ruta protegida tras
 * iniciar sesión, que es exactamente lo que este flujo necesita verificar.
 */
export class DashboardPage {
  readonly page: Page;
  readonly homeLink: Locator;
  readonly uploadLink: Locator;
  readonly assistantLink: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.homeLink = page.getByRole("link", { name: "Inicio" });
    this.uploadLink = page.getByRole("link", { name: "Cargar artículo" });
    this.assistantLink = page.getByRole("link", { name: "Asistente" });
    this.logoutButton = page.getByRole("button", { name: "Cerrar sesión" });
  }

  /** Email del usuario autenticado, tal como lo muestra la Navbar. */
  userEmail(email: string): Locator {
    return this.page.locator("header").getByText(email, { exact: true });
  }

  async waitUntilLoaded(): Promise<void> {
    await this.page.waitForURL((url) => url.pathname === ROUTES.home);
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
