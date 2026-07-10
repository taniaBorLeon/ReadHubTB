# @readhub/config (reservado)

Este paquete queda reservado para configuración de herramientas compartida
entre `apps/*` y `packages/*` — por ejemplo, un preset de ESLint común el día
que se defina uno (hoy el proyecto no tiene ningún `eslint.config.js`: es un
hueco preexistente de la infraestructura original, no algo introducido por
esta migración, y no se fabricó uno aquí solo para llenar esta carpeta).

**Qué NO vive aquí:** la configuración compartida de TypeScript. Esa ya tiene
su propio archivo, `tsconfig.base.json`, en la raíz del monorepo (siguiendo
la estructura solicitada), y cada paquete/app lo referencia vía
`"extends": "../../tsconfig.base.json"`.

**Qué sí podría vivir aquí en el futuro:** un preset de ESLint (`@readhub/config/eslint`),
un preset de Prettier, o un preset de Tailwind si `apps/mcp` alguna vez
necesitara una interfaz propia y quisiera reutilizar el sistema visual de
`apps/web`.
