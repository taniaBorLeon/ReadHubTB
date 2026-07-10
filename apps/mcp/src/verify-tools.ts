/**
 * Verifica el registro de Tools a través del protocolo MCP real (no
 * inspecciona el objeto del servidor por fuera de su API pública): conecta
 * un Client y un McpServer mediante un par de transportes en memoria
 * (InMemoryTransport, provisto por el propio SDK) y llama a listTools(),
 * exactamente el mismo mensaje que enviaría Claude Desktop u otro host MCP
 * real al conectarse.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createReadHubMcpServer } from "./server.js";

const EXPECTED_TOOLS = [
  "list_articles",
  "get_article",
  "search_articles",
  "semantic_search_articles",
  "ask_readhub",
  "compare_and_contrast_articles",
  "extract_main_themes",
  "generate_global_summary",
  "identify_document_relations",
  "build_research_context",
];

async function main() {
  const server = createReadHubMcpServer();
  const client = new Client({ name: "verify-client", version: "0.0.0" });

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  const { tools } = await client.listTools();
  const registeredNames = tools.map((tool) => tool.name).sort();

  console.log("Tools registradas en el servidor MCP de ReadHub:\n");
  for (const tool of tools) {
    console.log(`- ${tool.name}: ${tool.description}`);
  }

  const missing = EXPECTED_TOOLS.filter((name) => !registeredNames.includes(name));
  const unexpected = registeredNames.filter(
    (name) => !EXPECTED_TOOLS.includes(name),
  );

  console.log(`\nEsperadas: ${EXPECTED_TOOLS.length}. Registradas: ${tools.length}.`);

  if (missing.length > 0 || unexpected.length > 0) {
    if (missing.length > 0) console.error(`Faltan: ${missing.join(", ")}`);
    if (unexpected.length > 0)
      console.error(`No esperadas: ${unexpected.join(", ")}`);
    process.exit(1);
  }

  console.log("\nTodas las Tools esperadas están correctamente registradas.");
  await client.close();
  await server.close();
}

main().catch((error) => {
  console.error("Error verificando el registro de Tools:", error);
  process.exit(1);
});
