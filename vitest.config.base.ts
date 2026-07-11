import { defineConfig } from "vitest/config";

/**
 * Base compartida por todos los `vitest.config.ts` del monorepo (mismo
 * patrón que tsconfig.base.json): cada paquete la combina con mergeConfig()
 * y solo declara lo que le es propio (entorno, plugins, setupFiles).
 *
 * `include` fija la convención `*.test.ts(x)` para las pruebas unitarias de
 * Vitest -- los E2E de Playwright viven en carpetas `e2e/` con sufijo
 * `*.spec.ts`, explícitamente excluidas aquí, para que ningún archivo pueda
 * ser recogido por los dos frameworks a la vez.
 */
export default defineConfig({
  test: {
    include: ["**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/e2e/**",
    ],
    restoreMocks: true,
    // Todavía no existe ningún *.test.ts(x) en el proyecto (esta fase solo
    // deja lista la infraestructura) -- sin esto, `vitest run` fallaría con
    // "no test files found" pese a que la configuración es correcta.
    // Quitar en cuanto se agregue la primera prueba real.
    passWithNoTests: true,
  },
});
