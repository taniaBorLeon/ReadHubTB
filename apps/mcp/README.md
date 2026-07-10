# apps/mcp (reservado)

Esta carpeta está reservada para el futuro servidor MCP de ReadHub. No contiene
ninguna implementación todavía — ni el SDK de MCP, ni Tools, ni Resources, ni
Prompts (fuera de alcance de la fase de migración a monorepo).

Cuando se implemente, este servidor podrá reutilizar directamente, sin
duplicar lógica:

- `@readhub/ai` — `services/vector-search`, `services/chat`, `services/embedding`
  y `services/context-builder` ya encapsulan todo el pipeline RAG.
- `@readhub/database` — específicamente `service-role` (y el tipo `Database`),
  que no dependen de Next.js y funcionan en cualquier proceso Node.
- `@readhub/types` — contratos de datos compartidos.
- `@readhub/shared` — utilidades sin dependencia de UI/framework.

**Nota importante para cuando se implemente**: `@readhub/database`'s `client.ts`,
`server.ts` y `middleware.ts` dependen de `next/headers`/`next/server` y **no**
son utilizables desde un proceso MCP que no sea Next.js — solo `service-role.ts`
y `database.types.ts` son verdaderamente agnósticos de framework.
