import type { Locator, Page } from "@playwright/test";

import { ROUTES } from "../../lib/constants/routes";

/**
 * Selectores basados en atributos de accesibilidad ya presentes en la app
 * real (label asociado al input, texto/rol de los botones y del alert) --
 * ningún selector requiere tocar el código de producción.
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly alert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Correo electrónico");
    this.passwordInput = page.getByLabel("Contraseña");
    this.submitButton = page.getByRole("button", { name: "Iniciar sesión" });
    this.alert = page.getByRole("alert");
  }

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.login);
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async waitUntilLoaded(): Promise<void> {
    await this.page.waitForURL((url) => url.pathname === ROUTES.login);
  }
}
