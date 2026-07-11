import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "../../vitest.config.base";

export default mergeConfig(
  baseConfig,
  defineConfig({
    // Todos los módulos de este paquete llevan `import "server-only"`, que
    // solo es un no-op bajo la condición de exports "react-server" (mismo
    // hallazgo ya documentado en apps/mcp/README.md, allí resuelto con
    // `tsx --conditions=react-server`; aquí es el equivalente para Vite).
    // Sin esto, importar estos módulos en un test lanzaría en vez de
    // ejecutar el código real. Hace falta declararla en ambos lugares:
    // Vitest con entorno "node" resuelve los módulos de test por la rama
    // SSR de Vite, que ignora `resolve.conditions` y solo obedece
    // `ssr.resolve.conditions`.
    resolve: { conditions: ["react-server"] },
    ssr: { resolve: { conditions: ["react-server"] } },
    test: {
      environment: "node",
    },
  }),
);
