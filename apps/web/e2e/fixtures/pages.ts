import { test as base } from "@playwright/test";

import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";

interface PageObjectFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
}

/**
 * Extiende el `test` base de Playwright con los Page Objects ya
 * instanciados para la página actual -- cualquier spec futuro (no solo
 * auth.spec.ts) los obtiene importando este módulo en vez de reconstruir
 * `new LoginPage(page)` en cada archivo.
 */
export const test = base.extend<PageObjectFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect } from "@playwright/test";
