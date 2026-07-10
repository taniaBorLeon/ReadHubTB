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
├── components/{ui,layout,navigation,forms,cards,articles,comments,dialogs,chat}/
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
   - `OPENAI_API_KEY` (embeddings)
   - `ANTHROPIC_API_KEY` (Claude)
2. Aplicar las migraciones de `supabase/migrations/` contra el proyecto de Supabase (Dashboard → SQL Editor, o Supabase CLI).
3. `npm install`
4. `npm run dev`

## Decisiones arquitectónicas relevantes

- **`article_chunks` a nivel de chunk, no de artículo completo**: permite recuperación precisa y citar fragmentos concretos.
- **Índice HNSW** en vez de IVFFlat: da buena calidad de búsqueda desde el primer embedding insertado, sin depender de tener ya un volumen de datos representativo.
- **`match_article_chunks` resuelve el top-K con un CTE antes de filtrar por similitud**: evita que el planificador de Postgres descarte el índice HNSW al combinar el `ORDER BY`/`LIMIT` con un predicado de umbral sobre la misma expresión de distancia.
- **Todo lo que toca un proveedor externo (OpenAI, Claude, `service_role`) vive detrás de `server-only`** y solo es alcanzable vía Route Handlers — ningún hook ni componente puede importarlo.
- **Indexación no bloqueante**: publicar un artículo nunca falla ni se demora por un problema del pipeline de embeddings; los fallos quedan registrados en logs del servidor.
