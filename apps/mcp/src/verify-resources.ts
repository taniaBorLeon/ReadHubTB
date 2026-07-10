/**
 * Verifica el registro de Resources a través del protocolo MCP real (no
 * inspecciona el objeto del servidor por fuera de su API pública): conecta
 * un Client y un McpServer mediante un par de transportes en memoria
 * (InMemoryTransport, provisto por el propio SDK) y llama a
 * listResources()/listResourceTemplates(), exactamente lo que enviaría
 * Claude Desktop u otro host MCP real al conectarse.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createReadHubMcpServer } from "./server.js";

const EXPECTED_STATIC_RESOURCES = [
  "readhub://articles",
  "readhub://authors",
  "readhub://categories",
  "readhub://stats",
  "readhub://info",
];

const EXPECTED_TEMPLATES = ["article", "author"];

async function main() {
  const server = createReadHubMcpServer();
  const client = new Client({ name: "verify-client", version: "0.0.0" });

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  const { resources } = await client.listResources();
  const { resourceTemplates } = await client.listResourceTemplates();

  console.log("Resources estáticos registrados:\n");
  for (const resource of resources) {
    console.log(`- ${resource.uri} (${resource.name}): ${resource.description}`);
  }

  console.log("\nResource templates registrados:\n");
  for (const template of resourceTemplates) {
    console.log(
      `- ${template.uriTemplate} (${template.name}): ${template.description}`,
    );
  }

  const registeredUris = resources.map((r) => r.uri).sort();
  const registeredTemplateNames = resourceTemplates.map((t) => t.name).sort();

  const missingResources = EXPECTED_STATIC_RESOURCES.filter(
    (uri) => !registeredUris.includes(uri),
  );
  const missingTemplates = EXPECTED_TEMPLATES.filter(
    (name) => !registeredTemplateNames.includes(name),
  );

  console.log(
    `\nResources estáticos esperados: ${EXPECTED_STATIC_RESOURCES.length}. Registrados: ${resources.length}.`,
  );
  console.log(
    `Resource templates esperados: ${EXPECTED_TEMPLATES.length}. Registrados: ${resourceTemplates.length}.`,
  );

  if (missingResources.length > 0 || missingTemplates.length > 0) {
    if (missingResources.length > 0)
      console.error(`Faltan resources: ${missingResources.join(", ")}`);
    if (missingTemplates.length > 0)
      console.error(`Faltan templates: ${missingTemplates.join(", ")}`);
    process.exit(1);
  }

  // Lectura de humo: confirma que el ciclo completo resources/read del
  // protocolo devuelve contenido válido. Se limita deliberadamente a los
  // Resources que no requieren credenciales reales de Supabase (info y
  // categories), igual que verify-integration.ts evita invocar lógica que
  // depende de secretos que este script no tiene por qué tener configurados.
  const info = await client.readResource({ uri: "readhub://info" });
  const categories = await client.readResource({ uri: "readhub://categories" });
  console.log(
    `\nLectura de humo OK -- info: ${info.contents.length} contenido(s), categories: ${categories.contents.length}.`,
  );

  console.log("\nTodos los Resources esperados están correctamente registrados.");
  await client.close();
  await server.close();
}

main().catch((error) => {
  console.error("Error verificando el registro de Resources:", error);
  process.exit(1);
});
