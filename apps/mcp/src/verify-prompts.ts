/**
 * Verifica el registro de Prompts a través del protocolo MCP real: conecta
 * un Client y un McpServer mediante un par de transportes en memoria
 * (InMemoryTransport, provisto por el propio SDK) y llama a listPrompts(),
 * exactamente lo que enviaría Claude Desktop u otro host MCP real al
 * conectarse. No invoca getPrompt() -- cada Prompt necesita credenciales
 * reales de Supabase para resolver su artículo, igual que las Tools; esta
 * verificación se limita, a propósito, a confirmar el registro.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createReadHubMcpServer } from "./server.js";

const EXPECTED_PROMPTS = [
  "summarize_article",
  "explain_article",
  "compare_articles",
  "generate_questions",
  "extract_key_concepts",
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

  const { prompts } = await client.listPrompts();
  const registeredNames = prompts.map((prompt) => prompt.name).sort();

  console.log("Prompts registrados en el servidor MCP de ReadHub:\n");
  for (const prompt of prompts) {
    console.log(`- ${prompt.name}: ${prompt.description}`);
  }

  const missing = EXPECTED_PROMPTS.filter(
    (name) => !registeredNames.includes(name),
  );
  const unexpected = registeredNames.filter(
    (name) => !EXPECTED_PROMPTS.includes(name),
  );

  console.log(
    `\nEsperados: ${EXPECTED_PROMPTS.length}. Registrados: ${prompts.length}.`,
  );

  if (missing.length > 0 || unexpected.length > 0) {
    if (missing.length > 0) console.error(`Faltan: ${missing.join(", ")}`);
    if (unexpected.length > 0)
      console.error(`No esperados: ${unexpected.join(", ")}`);
    process.exit(1);
  }

  console.log("\nTodos los Prompts esperados están correctamente registrados.");
  await client.close();
  await server.close();
}

main().catch((error) => {
  console.error("Error verificando el registro de Prompts:", error);
  process.exit(1);
});
