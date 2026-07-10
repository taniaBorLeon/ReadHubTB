import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerArticleResources } from "./articles.js";
import { registerAuthorResources } from "./authors.js";
import { registerCategoryResources } from "./categories.js";
import { registerStatsResource } from "./stats.js";
import { registerInfoResource } from "./info.js";

/**
 * Punto único de registro de Resources. Añadir un nuevo Resource es: crear
 * su archivo en resources/ exportando un `registerXResource(s)(server)`, e
 * incluirlo en esta lista -- ningún otro archivo necesita cambiar.
 */
const RESOURCE_REGISTRARS = [
  registerArticleResources,
  registerAuthorResources,
  registerCategoryResources,
  registerStatsResource,
  registerInfoResource,
];

export function registerAllResources(server: McpServer): void {
  for (const register of RESOURCE_REGISTRARS) {
    register(server);
  }
}
