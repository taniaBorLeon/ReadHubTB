import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { toResourceResult } from "../lib/resource-result.js";

const ROOT_PACKAGE_JSON_PATH = fileURLToPath(
  new URL("../../../../package.json", import.meta.url),
);

interface RootPackageJson {
  name: string;
  version: string;
}

function readRootPackageJson(): RootPackageJson {
  const raw = readFileSync(ROOT_PACKAGE_JSON_PATH, "utf-8");
  const { name, version } = JSON.parse(raw) as RootPackageJson;
  return { name, version };
}

/**
 * Resource estático con la información general de la plataforma: nombre y
 * versión leídos del package.json raíz del monorepo (fuente única de verdad,
 * no se duplica el número de versión) más una descripción fija del
 * propósito y el stack, tal como se documentan en el README del proyecto.
 */
export function registerInfoResource(server: McpServer): void {
  server.registerResource(
    "info",
    "readhub://info",
    {
      title: "Información general de ReadHub",
      description:
        "Nombre, versión y descripción general de la plataforma ReadHub: qué es, su stack tecnológico y sus capacidades principales.",
      mimeType: "application/json",
    },
    async (uri) => {
      const { name, version } = readRootPackageJson();

      return toResourceResult(uri.href, {
        name,
        version,
        description:
          "ReadHub es una plataforma de publicación y lectura de artículos construida sobre Next.js 15 y Supabase, con un sistema RAG (Retrieval-Augmented Generation) integrado que permite hacer preguntas en lenguaje natural sobre el contenido publicado.",
        stack: [
          "Next.js 15 (App Router) + React 19 + TypeScript",
          "TailwindCSS v4 + Shadcn/UI",
          "Supabase (Auth, Postgres, Storage, pgvector)",
          "Embeddings de OpenAI + Claude (Anthropic) para el pipeline RAG",
        ],
        capabilities: [
          "Publicación y lectura de artículos con vistas, likes y comentarios",
          "Búsqueda semántica sobre el contenido indexado",
          "Asistente conversacional (RAG) sobre los artículos publicados",
          "Servidor MCP (este servidor) que expone artículos, autores, estadísticas y el pipeline RAG a clientes MCP",
        ],
      });
    },
  );
}
