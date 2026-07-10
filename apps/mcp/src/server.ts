import { fileURLToPath } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";

export function createReadHubMcpServer(): McpServer {
  const server = new McpServer({
    name: "readhub-mcp",
    version: "0.1.0",
  });

  registerAllTools(server);
  registerAllResources(server);

  return server;
}

async function main() {
  const server = createReadHubMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // stdout está reservado para los mensajes JSON-RPC del protocolo MCP;
  // cualquier log de diagnóstico debe ir a stderr.
  console.error("ReadHub MCP server listo (stdio).");
}

// Solo arranca el transporte stdio cuando este archivo se ejecuta como
// entrypoint (`npm run start`) -- si otro módulo lo importa (como el script
// de verificación) para reutilizar createReadHubMcpServer(), no debe
// disparar un servidor real por el efecto secundario del import.
const isEntryPoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  main().catch((error) => {
    console.error("Error fatal iniciando el servidor MCP:", error);
    process.exit(1);
  });
}
