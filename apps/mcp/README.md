# apps/mcp

Servidor MCP (Model Context Protocol) de ReadHub. Expone la plataforma a
cualquier cliente MCP (Claude Desktop, otros hosts) mediante Tools,
Resources y Prompts, reutilizando siempre la lógica compartida del
monorepo -- no reimplementa ninguna consulta ni servicio que ya exista en
`packages/*`.

## Cómo ejecutar y verificar

```sh
npm run start --workspace=mcp             # arranca el servidor (transporte stdio)
npm run typecheck --workspace=mcp         # solo tipos
npm run verify --workspace=mcp            # smoke test de imports de paquetes compartidos
npm run verify:tools --workspace=mcp      # confirma el registro de las 10 Tools
npm run verify:resources --workspace=mcp  # confirma el registro de los Resources/templates
npm run verify:prompts --workspace=mcp    # confirma el registro de los 5 Prompts
npm run verify:all --workspace=mcp        # las cuatro verificaciones anteriores en secuencia
```

Los scripts `verify:*` conectan un `Client` real del SDK de MCP contra el
servidor mediante `InMemoryTransport` y llaman a `listTools()` /
`listResources()` / `listPrompts()` -- es decir, comprueban el registro a
través del propio protocolo, no inspeccionando el servidor por dentro.
Deliberadamente no invocan `callTool()`/`readResource()`/`getPrompt()` salvo
cuando el Resource no depende de credenciales reales (`info`, `categories`):
la mayoría de las capacidades necesitan Supabase/OpenAI/Anthropic
configurados, y estas verificaciones están pensadas para poder ejecutarse
sin esas credenciales.

## Estructura

```
src/
├── server.ts        # createReadHubMcpServer(): registra Tools, Resources y Prompts
├── tools/            # 10 Tools -- índice único en tools/index.ts
├── resources/        # 5 Resources + 2 templates -- índice único en resources/index.ts
├── prompts/           # 5 Prompts -- índice único en prompts/index.ts
├── lib/               # helpers compartidos entre Tools/Resources/Prompts (ver abajo)
└── verify-*.ts        # scripts de verificación de registro (no son el servidor)
```

Cada carpeta (`tools/`, `resources/`, `prompts/`) sigue el mismo patrón:
un archivo por capacidad que exporta `registerX(server)`, y un `index.ts`
con un array de registradores + `registerAllX(server)`. Añadir una
capacidad nueva es crear su archivo y añadirlo a ese array -- ningún otro
archivo cambia.

### `lib/` -- qué resuelve cada helper

- `tool-result.ts` -- formato de respuesta de las Tools (`CallToolResult`) y
  las annotations de solo lectura compartidas por las 10.
- `resource-result.ts` -- formato de lectura de los Resources
  (`ReadResourceResult`).
- `prompt-content.ts` -- bloques de mensaje de los Prompts (texto / recurso
  embebido).
- `resolve-articles.ts` -- resuelve un conjunto de ids de artículo a partir
  de una lista explícita o de un tema (vía búsqueda semántica). Compartido
  por el Prompt `compare_articles` y las Tools de análisis avanzado.
- `article-corpus.ts` -- reúne metadata + contenido completo indexado de un
  conjunto de artículos, listo para pasarle a Claude.
- `content-analysis.ts` -- flujo común de las 4 Tools de análisis que
  invocan a Claude (resolver ids → reunir contenido → generar).

## Capacidades expuestas

- **Tools** (10): `list_articles`, `get_article`, `search_articles`,
  `semantic_search_articles`, `ask_readhub`, `compare_and_contrast_articles`,
  `extract_main_themes`, `generate_global_summary`,
  `identify_document_relations`, `build_research_context`.
- **Resources** (5 estáticos + 2 templates): `readhub://articles`,
  `readhub://authors`, `readhub://categories`, `readhub://stats`,
  `readhub://info`, `readhub://articles/{articleId}`,
  `readhub://authors/{authorId}`.
- **Prompts** (5): `summarize_article`, `explain_article`,
  `compare_articles`, `generate_questions`, `extract_key_concepts`.

## Paquetes compartidos disponibles

- **`@readhub/ai`** -- pipeline RAG completo: `services/embedding`,
  `services/vector-search`, `services/context-builder`, `services/chat`, más
  los wrappers de proveedor (`embeddings.ts` para OpenAI, `chat.ts` para
  Claude). Es lo que invocan `ask_readhub`, `semantic_search_articles`,
  `build_research_context` y las 4 Tools de análisis.
- **`@readhub/database`** -- **solo `service-role`, `types`,
  `queries/articles` y `queries/chunks`** son utilizables aquí. `client.ts`,
  `server.ts` y `middleware.ts` importan `next/headers` / `next/server` y
  **no existen** fuera de un proceso Next.js: no los importes desde
  `apps/mcp`.
- **`@readhub/types`** -- contratos de datos compartidos (`article`,
  `comment`, `user`, `chat`, `vector-search`).
- **`@readhub/shared`** -- utilidades sin dependencia de UI/framework
  (`storage-url`, constantes de Storage).

## Hallazgo importante (léelo antes de tocar esto)

`@readhub/database/service-role` y todos los archivos de `@readhub/ai`
llevan `import "server-only"` -- un marcador que **solo es inofensivo cuando
el bundler establece la condición de exports `"react-server"`** (algo que
hace el webpack de Next.js al compilar Server Components, y nada más).
Ejecutado en un proceso Node normal -- como este servidor MCP -- ese paquete
**lanza una excepción real** en vez de no hacer nada.

La solución, ya aplicada en todos los scripts de este `package.json`
(`start`, `verify`, `verify:tools`, `verify:resources`, `verify:prompts`),
es ejecutar el proceso con la condición de exports `react-server`
habilitada:

```sh
tsx --conditions=react-server src/algo.ts
```

No se modificó `server-only` en los paquetes compartidos para no debilitar
la protección que ya cumple su función dentro de `apps/web` (evita que un
componente cliente importe por error código con secretos).
