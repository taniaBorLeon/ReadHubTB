/**
 * Script de verificación de integración -- NO es el servidor MCP.
 *
 * Objetivo único de esta fase: confirmar que apps/mcp puede importar la
 * lógica de negocio existente de ReadHub desde los paquetes compartidos del
 * monorepo, sin duplicarla. No implementa Tools, Resources ni Prompts, y no
 * instala el SDK de MCP.
 *
 * A propósito solo se referencian las funciones (no se invocan las que
 * dependen de credenciales reales de Supabase/OpenAI/Anthropic, que este
 * proceso no tiene por qué tener configuradas todavía) -- comprobar que el
 * import resuelve y que el símbolo es del tipo esperado ya prueba que el
 * módulo compartido es consumible desde aquí.
 *
 * A propósito NO se importa nada de "@readhub/database/client",
 * "@readhub/database/server" ni "@readhub/database/middleware": esos tres
 * dependen de next/headers y next/server y no existen fuera de un proceso
 * Next.js. El único cliente de datos válido para un proceso MCP (Node
 * plano) es "@readhub/database/service-role".
 */

import { createServiceRoleClient } from "@readhub/database/service-role";
import type { Database } from "@readhub/database/types";

import type { ArticleWithStats } from "@readhub/types/article";
import type { CommentWithAuthor } from "@readhub/types/comment";
import type { ChatMessage } from "@readhub/types/chat";
import type { VectorSearchResult } from "@readhub/types/vector-search";

import { generateEmbedding, generateEmbeddings } from "@readhub/ai/embeddings";
import { generateChatCompletion } from "@readhub/ai/chat";
import { searchRelevantChunks } from "@readhub/ai/services/vector-search";
import { buildRagContext } from "@readhub/ai/services/context-builder";
import { answerQuery } from "@readhub/ai/services/chat";
import { generateArticleEmbeddings } from "@readhub/ai/services/embedding";
import { EMBEDDING_MODEL, CLAUDE_MODEL } from "@readhub/ai/constants";

import { getPublicStorageUrl } from "@readhub/shared/storage-url";
import { ARTICLES_BUCKET } from "@readhub/shared/storage-constants";

interface CheckResult {
  label: string;
  pass: boolean;
}

const checks: CheckResult[] = [];

function check(label: string, condition: boolean) {
  checks.push({ label, pass: condition });
}

// @readhub/database -- solo la porción agnóstica de framework.
check(
  "@readhub/database/service-role: createServiceRoleClient importado",
  typeof createServiceRoleClient === "function",
);

// @readhub/types -- contratos de datos (verificación en tiempo de compilación,
// no de ejecución: si esto compila, los tipos ya se resolvieron).
const _typeSmokeTest: {
  article?: ArticleWithStats;
  comment?: CommentWithAuthor;
  chat?: ChatMessage;
  vector?: VectorSearchResult;
  db?: Database;
} = {};
void _typeSmokeTest;
check("@readhub/types/*: tipos de dominio resueltos en compilación", true);

// @readhub/ai -- pipeline RAG completo, reutilizado tal cual (sin duplicar).
check(
  "@readhub/ai/embeddings: generateEmbedding/generateEmbeddings importados",
  typeof generateEmbedding === "function" &&
    typeof generateEmbeddings === "function",
);
check(
  "@readhub/ai/chat: generateChatCompletion importado",
  typeof generateChatCompletion === "function",
);
check(
  "@readhub/ai/services/vector-search: searchRelevantChunks importado",
  typeof searchRelevantChunks === "function",
);
check(
  "@readhub/ai/services/context-builder: buildRagContext importado",
  typeof buildRagContext === "function",
);
check(
  "@readhub/ai/services/chat: answerQuery importado",
  typeof answerQuery === "function",
);
check(
  "@readhub/ai/services/embedding: generateArticleEmbeddings importado",
  typeof generateArticleEmbeddings === "function",
);
check(
  "@readhub/ai/constants: EMBEDDING_MODEL y CLAUDE_MODEL resueltos",
  typeof EMBEDDING_MODEL === "string" && typeof CLAUDE_MODEL === "string",
);

// @readhub/shared -- única sin efectos secundarios: se invoca de verdad.
const sampleUrl = getPublicStorageUrl("sample/path.png");
check(
  "@readhub/shared/storage-url: getPublicStorageUrl ejecutado",
  sampleUrl.includes(ARTICLES_BUCKET),
);

const failed = checks.filter((c) => !c.pass);

console.log("Verificación de integración apps/mcp -> paquetes compartidos\n");
for (const c of checks) {
  console.log(`${c.pass ? "OK  " : "FAIL"} ${c.label}`);
}

if (failed.length > 0) {
  console.error(`\n${failed.length} verificación(es) fallida(s).`);
  process.exit(1);
}

console.log(
  `\nTodas las verificaciones pasaron (${checks.length}/${checks.length}). ` +
    "apps/mcp puede consumir @readhub/database, @readhub/types, @readhub/ai y " +
    "@readhub/shared sin duplicar lógica.",
);
