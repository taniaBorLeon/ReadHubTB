import { defineConfig, mergeConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

import baseConfig from "../../vitest.config.base";

/**
 * `resolve.tsconfigPaths` lee el alias `@/*` directamente de
 * apps/web/tsconfig.json en vez de duplicarlo aquí a mano -- si el alias
 * cambia, no hay dos sitios que mantener sincronizados. (Soporte nativo de
 * Vite 8; ya no hace falta el plugin `vite-tsconfig-paths`.)
 */
export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [react()],
    resolve: { tsconfigPaths: true },
    test: {
      environment: "jsdom",
      setupFiles: ["./vitest.setup.ts"],
    },
  }),
);
