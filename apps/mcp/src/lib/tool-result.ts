import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

/**
 * Todas las Tools de ReadHub son de solo lectura sobre su propio dominio de
 * datos (nunca escriben, y no interactúan con entidades externas fuera de
 * ReadHub/Claude): mismas annotations para las 10, compartidas para no
 * repetir el mismo literal en cada archivo.
 */
export const READ_ONLY_TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  openWorldHint: false,
};

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
