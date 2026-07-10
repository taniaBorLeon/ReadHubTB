import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerListArticlesTool } from "./list-articles.js";
import { registerGetArticleTool } from "./get-article.js";
import { registerSearchArticlesTool } from "./search-articles.js";
import { registerSemanticSearchArticlesTool } from "./semantic-search-articles.js";
import { registerAskReadHubTool } from "./ask-readhub.js";
import { registerCompareAndContrastArticlesTool } from "./compare-and-contrast-articles.js";
import { registerExtractMainThemesTool } from "./extract-main-themes.js";
import { registerGenerateGlobalSummaryTool } from "./generate-global-summary.js";
import { registerIdentifyDocumentRelationsTool } from "./identify-document-relations.js";
import { registerBuildResearchContextTool } from "./build-research-context.js";

/**
 * Punto único de registro de Tools. Añadir una nueva Tool es: crear su
 * archivo en tools/ exportando un `registerXTool(server)`, e incluirlo en
 * esta lista -- ningún otro archivo necesita cambiar.
 */
const TOOL_REGISTRARS = [
  registerListArticlesTool,
  registerGetArticleTool,
  registerSearchArticlesTool,
  registerSemanticSearchArticlesTool,
  registerAskReadHubTool,
  registerCompareAndContrastArticlesTool,
  registerExtractMainThemesTool,
  registerGenerateGlobalSummaryTool,
  registerIdentifyDocumentRelationsTool,
  registerBuildResearchContextTool,
];

export function registerAllTools(server: McpServer): void {
  for (const register of TOOL_REGISTRARS) {
    register(server);
  }
}
