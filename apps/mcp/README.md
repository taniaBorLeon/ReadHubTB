# apps/mcp (reservado)

Esta carpeta está reservada para el futuro servidor MCP de ReadHub. **No
contiene ninguna implementación todavía** — ni el SDK de MCP, ni Tools, ni
Resources, ni Prompts. Lo único que existe es `src/verify-integration.ts`,
un script de verificación (no el servidor) que confirma que este workspace
puede importar y ejecutar la lógica de negocio compartida sin duplicarla.

## Cómo verificar la integración

```sh
npm run verify --workspace=mcp      # ejecuta las importaciones reales (Node)
npm run typecheck --workspace=mcp   # solo tipos
```

## Paquetes compartidos disponibles

- **`@readhub/ai`** — pipeline RAG completo y ya funcional: `services/embedding`,
  `services/vector-search`, `services/context-builder`, `services/chat`, más
  los wrappers de proveedor (`embeddings.ts` para OpenAI, `chat.ts` para
  Claude). Es exactamente lo que las futuras Tools del servidor MCP
  invocarán.
- **`@readhub/database`** — **solo `service-role` y `types`** son utilizables
  aquí. `client.ts`, `server.ts` y `middleware.ts` importan `next/headers` /
  `next/server` y **no existen** fuera de un proceso Next.js: no los importes
  desde `apps/mcp`.
- **`@readhub/types`** — contratos de datos compartidos (`article`, `comment`,
  `user`, `chat`, `vector-search`).
- **`@readhub/shared`** — utilidades sin dependencia de UI/framework
  (`storage-url`, constantes de Storage).

## Hallazgo importante descubierto al verificar (léelo antes de tocar esto)

`@readhub/database/service-role` y todos los archivos de `@readhub/ai` llevan
`import "server-only"` -- un marcador que **solo es inofensivo cuando el
bundler establece la condición de exports `"react-server"`** (algo que hace
el webpack de Next.js al compilar Server Components, y nada más). Ejecutado
en un proceso Node normal -- exactamente lo que será un servidor MCP -- ese
paquete **lanza una excepción real** en vez de no hacer nada.

La solución, ya aplicada en el script `verify` de este `package.json`, es
ejecutar el proceso con la condición de exports `react-server` habilitada:

```sh
tsx --conditions=react-server src/algo.ts
```

**Cuando se implemente el servidor MCP real, su comando de arranque deberá
incluir la misma bandera** (`--conditions=react-server`, vía `tsx` o
equivalente en Node puro con `--conditions`), o las llamadas a
`@readhub/ai`/`@readhub/database/service-role` fallarán igual que le pasó a
este script antes de descubrirlo. No se modificó `server-only` en los
paquetes compartidos para no debilitar la protección que ya cumple su
función dentro de `apps/web` (evita que un componente cliente importe por
error código con secretos).
