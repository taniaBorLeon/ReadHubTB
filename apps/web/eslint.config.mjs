import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * eslint-config-next todavía no publica una config nativa en formato flat
 * (ESLint 9): FlatCompat es el puente oficial documentado por Next.js para
 * seguir usando "next/core-web-vitals" y "next/typescript" con ESLint 9.
 */
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      // Generado por `next dev`/`next build`, ya excluido de git en
      // .gitignore -- no es código del proyecto que deba lintearse.
      "next-env.d.ts",
      // Código de Playwright, no de React: eslint-plugin-react-hooks
      // interpreta erróneamente el `use()` de los fixtures de Playwright
      // como el hook `use` de React y falla con "React Hook 'use' is
      // called in function that is neither a component nor a hook".
      "e2e/**",
      "playwright.config.ts",
    ],
  },
];

export default eslintConfig;
