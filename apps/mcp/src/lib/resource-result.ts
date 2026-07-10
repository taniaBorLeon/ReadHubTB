import type { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Formato de lectura compartido por todos los Resources: serializa el
 * resultado ya calculado por la capa de datos/servicios de ReadHub como JSON.
 * No transforma ni reinterpreta datos -- solo lo empaqueta en el formato que
 * exige el protocolo MCP para `resources/read`.
 */
export function toResourceResult(uri: string, data: unknown): ReadResourceResult {
  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}
