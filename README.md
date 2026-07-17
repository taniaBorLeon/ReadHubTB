# ReadHub

Plataforma de publicación y lectura de artículos construida sobre Next.js 15 y
Supabase, con un sistema RAG (Retrieval-Augmented Generation) integrado que
permite consultar el conocimiento publicado en la plataforma en lenguaje
natural mediante un asistente conversacional basado en Claude.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- TailwindCSS v4 + Shadcn/UI
- Supabase (Auth, Postgres, Storage, pgvector)
- OpenAI (embeddings) + Anthropic Claude (generación conversacional)

## Arquitectura

Todas las capas siguen una única regla de dependencia, sin excepciones:

```
Componentes (presentación pura)
      │
      ▼
   Hooks (estado + orquestación, "use client")
      │
      ▼
Route Handlers (app/api/**) — única puerta a lógica con secretos
      │
      ▼
   Services (server-only) ──────► lib/ai (proveedores IA) / lib/supabase
      │                                  (Supabase / OpenAI / Claude)
      ▼
     Supabase Postgres (RLS + pgvector)
```

Ningún componente llama a Supabase, OpenAI o Claude directamente. Los archivos
que sí tocan esos proveedores (`lib/ai/*`, `lib/supabase/service-role.ts`,
todos los `services/*` del sistema RAG) importan `server-only`, así que un
import accidental desde un componente "use client" rompe el build en vez de
filtrar una API key al navegador.

### Flujo del MVP (artículos)

Registro/Login (Supabase Auth) → Home (listado vía RPC) → Detalle de
artículo (registra vista, comentarios, likes) → Publicación (valida, sube a
Storage, inserta en `articles`).

### Flujo del sistema RAG

**Indexación** (automática, no bloqueante, disparada tras publicar):
`article.service.createArticle` → `POST /api/articles/{id}/index` →
`embedding.service.generateArticleEmbeddings` → descarga el documento de
Storage → extrae texto (TXT / DOCX vía `mammoth` / PDF vía `pdf-parse`) →
trocea y compone cada chunk con título+resumen → `lib/ai/embeddings`
(OpenAI, en una sola petición por artículo) → reemplaza los chunks
existentes en `article_chunks` (vía `service_role`, ver más abajo).

**Consulta** (`/assistant`): `useChat` → `POST /api/chat` →
`chat.service.answerQuery` orquesta:
`vector-search.service` (embedding de la consulta + búsqueda por similitud
vía la función SQL `match_article_chunks`, índice HNSW) →
`context-builder.service` (selecciona, fusiona chunks contiguos, limita por
presupuesto de caracteres, arma el prompt) → `lib/ai/chat` (Claude) →
respuesta + fuentes citadas.

## Responsabilidades por módulo

| Módulo | Responsabilidad |
|---|---|
| `services/auth·article·comment·storage.service.ts` | CRUD del MVP, llaman a Supabase con el cliente de sesión del usuario |
| `services/embedding.service.ts` | Extracción + chunking + embeddings + persistencia de un artículo |
| `services/vector-search.service.ts` | Único responsable de la búsqueda por similitud |
| `services/context-builder.service.ts` | Función pura: arma el prompt a partir de resultados ya recuperados |
| `services/chat.service.ts` | Orquesta los tres anteriores + invoca a Claude; único punto de entrada del asistente |
| `lib/ai/embeddings.ts` / `lib/ai/chat.ts` | Único punto de contacto con OpenAI / Claude respectivamente |
| `lib/supabase/service-role.ts` | Cliente con `service_role` (bypassa RLS), exclusivo de los services de RAG |
| `lib/api/require-user.ts` | Chequeo de sesión compartido por los Route Handlers |
| `hooks/*` | Único lugar donde los componentes tocan estado/lógica |
| `components/*` | Presentación pura, sin lógica de negocio |

## Base de datos

18 migraciones del MVP (tablas, RLS, funciones de lectura agregada,
bucket de Storage) + 6 migraciones del sistema RAG (extensión `pgvector`,
tabla `article_chunks`, índices HNSW, RLS, función `match_article_chunks` y
su optimización posterior). Todas en `supabase/migrations/`, aplicadas en
orden; `supabase/schema.sql` y `supabase/policies.sql` son espejos de
solo lectura para consulta rápida (la fuente de verdad ejecutable son las
migraciones).

## Estructura

```
readhub/
├── app/
│   ├── (auth)/{login,register}/
│   ├── (dashboard)/{page,upload,assistant,article/[id]}/
│   └── api/{chat,articles/[id]/index}/route.ts
├── components/{ui,layout,navigation,forms,cards,articles,comments,chat}/
├── hooks/            # useAuth, useArticles, useComments, useLikes, useUpload, useChat
├── services/         # 4 del MVP + 4 del sistema RAG (todos server-only estos últimos)
├── lib/
│   ├── ai/           # embeddings.ts, chat.ts — únicos puntos de contacto con proveedores IA
│   ├── api/          # helpers compartidos de Route Handlers
│   ├── supabase/      # client, server, middleware, service-role
│   ├── validators/, constants/, utils/
├── types/            # database, article, comment, user, chat, vector-search
├── supabase/
│   ├── migrations/
│   ├── schema.sql, policies.sql (referencia)
│   └── seed.sql
└── middleware.ts     # protege toda ruta /(dashboard) y /api/* salvo /login y /register
```

## Configuración

1. Copiar `.env.example` a `.env.local` y completar:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `VOYAGE_API_KEY` (embeddings)
   - `GROQ_API_KEY` (chat)
2. Aplicar las migraciones de `supabase/migrations/` contra el proyecto de Supabase (Dashboard → SQL Editor, o Supabase CLI).
3. `npm install`
4. `npm run dev`

> El `.env.example` real vive en `apps/web/.env.example` (monorepo con npm
> workspaces: `apps/web`, `apps/mcp`, `packages/*`).

## CI/CD

`.github/workflows/ci.yml` corre en cada `push` a `main`/`master` y en cada
`pull_request`, con 4 jobs encadenados por `needs`:

```
checks (typecheck → lint → vitest)
   │
   ▼
  e2e (Playwright, requiere Secrets de Supabase)
   │
   ▼
performance (Production Build → tamaño de bundle → Lighthouse CI)
   │
   ▼
 deploy (Vercel — solo en push a main/master, solo si todo lo anterior pasó)
```

Cada job publica sus propios artefactos (`vitest-report`, `playwright-report`,
`playwright-test-results`, `bundle-size-report`, reportes de Lighthouse). Si
`performance` falla (bundle por encima del límite o umbral de Lighthouse
incumplido), `deploy` se salta automáticamente — no hay despliegue sin
rendimiento validado. Ver [`.github/SECRETS.md`](.github/SECRETS.md) para
todos los secrets requeridos por `e2e`, `performance` y `deploy` (incluye
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` para el despliegue).

Los mismos comandos corren en local desde la raíz del monorepo:

```sh
npm run typecheck   # tsc --noEmit en cada workspace
npm run lint        # eslint (apps/web)
npm run test        # vitest run en apps/web + packages/{database,ai,shared}
npm run test:e2e    # playwright test (arranca `next dev` automáticamente)
```

## Rendimiento

Optimizaciones aplicadas tras la auditoría de Core Web Vitals (sin tocar
lógica de negocio, flujo RAG, APIs ni arquitectura):

- **`useAuth()` memoizado** (`useMemo` sobre el objeto de retorno) — evita
  re-renders en cascada en los 3 puntos que consumen el hook.
- **`React.memo`** en componentes renderizados dentro de listas
  (`ArticleCard`, `CommentItem`, `SourcesList`, `LoadingMessage`) + instancias
  de `Intl.DateTimeFormat` hoisteadas a nivel de módulo en vez de recrearse en
  cada render.
- **`useUpload`**: las dos subidas independientes (documento + imagen) se
  paralelizan con `Promise.all` en vez de ejecutarse en serie.
- **Eliminación de código muerto**: `components/dialogs/ConfirmDialog.tsx` no
  tenía ningún consumidor en la app y se enviaba igual al bundle del cliente.
- **`next.config.ts`**: `experimental.optimizePackageImports: ["lucide-react"]`
  para evitar que el barrel file del paquete de íconos se procese completo.

**Impacto en Core Web Vitals:** estas optimizaciones reducen trabajo de
scripting en el hilo principal durante interacciones (dar like, comentar,
usar el asistente) — mejora principalmente **INP**, y en menor medida
**TBT**/tamaño de bundle inicial. No atacan **LCP** ni **CLS** de raíz: la
causa principal identificada en la auditoría (todas las páginas son
`"use client"` y buscan sus datos en un `useEffect` post-mount en vez de vía
Server Components) requeriría un cambio de arquitectura de datos, fuera de
alcance de esta ronda de optimizaciones.

El pipeline valida estas mejoras automáticamente en el job `performance`:
build de producción real, límite de tamaño de bundle
(`BUNDLE_SIZE_LIMIT_KB` en `ci.yml`, hoy 200 kB de First Load JS compartido) y
auditoría Lighthouse contra los umbrales de
[`apps/web/lighthouserc.json`](apps/web/lighthouserc.json) (performance score,
LCP, CLS, TBT, TTI).

### Buenas prácticas para mantener el rendimiento

- Todo componente que se renderiza dentro de una lista (`*List.tsx`,
  `.map(...)`) debe envolverse en `React.memo` si recibe props que no cambian
  en cada render del padre.
- No crear instancias de `Intl.*`, `RegExp` u objetos de configuración
  equivalentes dentro del cuerpo de un componente — hoistearlas a nivel de
  módulo.
- Antes de agregar `"use client"` a una página o layout nuevo, confirmar que
  de verdad necesita estado/efectos/APIs del navegador — cada boundary nuevo
  empuja el fetch de datos a después de la hidratación.
- Revisar el artefacto `bundle-size-report` en cada PR que agregue una
  dependencia nueva al cliente; si el límite de `BUNDLE_SIZE_LIMIT_KB` se
  vuelve un obstáculo real (no una regresión), ajustarlo deliberadamente en
  `ci.yml`, no eliminarlo.
- Mantener los umbrales de `apps/web/lighthouserc.json` alineados con las
  expectativas reales del producto — bajarlos para que el pipeline pase nunca
  es la solución correcta a una regresión de performance.

## Decisiones arquitectónicas relevantes

- **`article_chunks` a nivel de chunk, no de artículo completo**: permite recuperación precisa y citar fragmentos concretos.
- **Índice HNSW** en vez de IVFFlat: da buena calidad de búsqueda desde el primer embedding insertado, sin depender de tener ya un volumen de datos representativo.
- **`match_article_chunks` resuelve el top-K con un CTE antes de filtrar por similitud**: evita que el planificador de Postgres descarte el índice HNSW al combinar el `ORDER BY`/`LIMIT` con un predicado de umbral sobre la misma expresión de distancia.
- **Todo lo que toca un proveedor externo (OpenAI, Claude, `service_role`) vive detrás de `server-only`** y solo es alcanzable vía Route Handlers — ningún hook ni componente puede importarlo.
- **Indexación no bloqueante**: publicar un artículo nunca falla ni se demora por un problema del pipeline de embeddings; los fallos quedan registrados en logs del servidor.
