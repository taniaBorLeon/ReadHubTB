import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { answerQuery } from "@readhub/ai/services/chat";

import { toErrorResult, toToolResult } from "../lib/tool-result.js";

export function registerAskReadHubTool(server: McpServer): void {
  server.registerTool(
    "ask_readhub",
    {
      title: "Preguntar a ReadHub",
      description:
        "Responde una pregunta en lenguaje natural utilizando exclusivamente el conocimiento publicado en ReadHub. Ejecuta el pipeline RAG completo (búsqueda semántica + construcción de contexto + Claude) reutilizando el mismo servicio conversacional que usa el asistente de la web, e incluye las fuentes citadas.",
      inputSchema: {
        question: z
          .string()
          .min(1)
          .describe(
            "Pregunta en lenguaje natural sobre el contenido publicado en ReadHub",
          ),
      },
    },
    async ({ question }) => {
      try {
        const result = await answerQuery(question);
        return toToolResult(result);
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
