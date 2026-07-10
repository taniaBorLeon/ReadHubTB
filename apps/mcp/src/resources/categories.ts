import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { toResourceResult } from "../lib/resource-result.js";

/**
 * ReadHub no tiene actualmente ningún sistema de categorías/etiquetas: la
 * tabla `articles` no incluye columna de categoría y no existe ninguna tabla
 * ni función RPC relacionada. En vez de inventar una taxonomía o simular
 * datos, este Resource lo declara explícitamente devolviendo una lista vacía
 * junto con `supported: false`, dejando el mismo URI ya reservado para
 * cuando ReadHub incorpore categorías reales.
 */
export function registerCategoryResources(server: McpServer): void {
  server.registerResource(
    "categories",
    "readhub://categories",
    {
      title: "Categorías de ReadHub",
      description:
        "ReadHub no dispone actualmente de un sistema de categorías o etiquetas para artículos. Este Resource devuelve una lista vacía y `supported: false` en lugar de simular datos inexistentes.",
      mimeType: "application/json",
    },
    async (uri) => {
      return toResourceResult(uri.href, {
        supported: false,
        message:
          "El esquema de ReadHub no define categorías ni etiquetas para artículos.",
        categories: [],
      });
    },
  );
}
