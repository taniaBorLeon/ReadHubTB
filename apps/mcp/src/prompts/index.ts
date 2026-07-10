import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerSummarizeArticlePrompt } from "./summarize-article.js";
import { registerExplainArticlePrompt } from "./explain-article.js";
import { registerCompareArticlesPrompt } from "./compare-articles.js";
import { registerGenerateQuestionsPrompt } from "./generate-questions.js";
import { registerExtractKeyConceptsPrompt } from "./extract-key-concepts.js";

/**
 * Punto único de registro de Prompts. Añadir un nuevo Prompt es: crear su
 * archivo en prompts/ exportando un `registerXPrompt(server)`, e incluirlo
 * en esta lista -- ningún otro archivo necesita cambiar.
 */
const PROMPT_REGISTRARS = [
  registerSummarizeArticlePrompt,
  registerExplainArticlePrompt,
  registerCompareArticlesPrompt,
  registerGenerateQuestionsPrompt,
  registerExtractKeyConceptsPrompt,
];

export function registerAllPrompts(server: McpServer): void {
  for (const register of PROMPT_REGISTRARS) {
    register(server);
  }
}
