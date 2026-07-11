import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "../../vitest.config.base";

export default mergeConfig(
  baseConfig,
  defineConfig({
    // A diferencia de packages/ai, las funciones testeables de este paquete
    // (src/queries/*) reciben el SupabaseClient inyectado como parámetro y
    // no importan client.ts/server.ts/service-role.ts (los que sí llevan
    // `import "server-only"`). Si en el futuro se prueba directamente
    // alguno de esos, habrá que añadir `resolve.conditions: ["react-server"]`
    // como en packages/ai/vitest.config.ts.
    test: {
      environment: "node",
    },
  }),
);
