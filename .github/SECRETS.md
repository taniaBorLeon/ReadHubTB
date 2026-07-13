# Secrets requeridos por el pipeline de CI

`.github/workflows/ci.yml` no contiene ningún valor sensible — todos los que
necesita se leen en tiempo de ejecución desde **Settings → Secrets and
variables → Actions** del repositorio en GitHub. Sin configurarlos, el job
`checks` corre igual (no los necesita), pero el job `e2e` fallará al intentar
autenticarse contra Supabase (comportamiento esperado, no un bug: ver
`apps/web/e2e/data/users.ts`).

## Cómo configurarlos

Repositorio en GitHub → **Settings** → **Secrets and variables** → **Actions**
→ **New repository secret**, uno por cada fila de la tabla, con el mismo
nombre exacto (sensible a mayúsculas).

## Secrets necesarios

| Secret | Usado por | De dónde sacarlo | Requerido para |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `packages/database` (todos los clientes), middleware | Panel de Supabase → Settings → API → Project URL | job `e2e` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `packages/database` (cliente de sesión/navegador) | Panel de Supabase → Settings → API → anon public | job `e2e` |
| `SUPABASE_SERVICE_ROLE_KEY` | `packages/database/service-role`, `packages/ai` (embeddings/RAG), `apps/mcp` | Panel de Supabase → Settings → API → service_role (secreta) | job `e2e` (rutas que la usan, si el flujo probado las toca) |
| `OPENAI_API_KEY` | `packages/ai/src/embeddings.ts` | platform.openai.com → API keys | job `e2e` (solo si el flujo probado indexa/busca) |
| `ANTHROPIC_API_KEY` | `packages/ai/src/chat.ts` | console.anthropic.com → API keys | job `e2e` (solo si el flujo probado usa el asistente) |
| `E2E_USER_EMAIL` | `apps/web/e2e/data/users.ts` | Un usuario real que exista en el proyecto de Supabase de `NEXT_PUBLIC_SUPABASE_URL` | job `e2e` |
| `E2E_USER_PASSWORD` | `apps/web/e2e/data/users.ts` | Contraseña de esa misma cuenta | job `e2e` |

`E2E_USER_EMAIL`/`E2E_USER_PASSWORD` son opcionales en sentido estricto (el
código tiene un valor por defecto que coincide con `supabase/seed.sql`), pero
**ese usuario debe existir de verdad** en el proyecto de Supabase apuntado por
`NEXT_PUBLIC_SUPABASE_URL` para que el E2E de autenticación pase. `seed.sql`
está pensado para `supabase db reset` contra un stack local — si
`NEXT_PUBLIC_SUPABASE_URL` apunta a un proyecto remoto, hay que sembrarlo ahí
manualmente o usar una cuenta real ya existente vía estos dos secrets.

## Qué NO hace falta configurar

- No hace falta ningún secret para el job `checks` (`typecheck`, `lint`,
  `test`): los servicios que tocan `import "server-only"` se prueban con
  mocks (ver `packages/ai/src/**.test.ts`, `apps/web/services/**.test.ts`),
  nunca contra Supabase/OpenAI/Anthropic reales.
- No hace falta ningún token de despliegue: este pipeline valida, no
  despliega nada.
