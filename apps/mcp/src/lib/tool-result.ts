import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Formato de respuesta compartido por todas las Tools: serializa el
 * resultado ya calculado por la capa de servicios de ReadHub. No transforma
 * ni reinterpreta datos -- solo lo empaqueta en el formato que exige el
 * protocolo MCP.
 */
export function toToolResult(data: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

export function toErrorResult(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}
