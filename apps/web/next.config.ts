import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Paquetes internos del monorepo: se consumen como TypeScript fuente sin
  // paso de build propio -- Next.js los transpila igual que el resto de la
  // app (mismo mecanismo que ya usa para node_modules pre-compilados).
  transpilePackages: [
    "@readhub/database",
    "@readhub/types",
    "@readhub/ai",
    "@readhub/shared",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // lucide-react ya se importa ícono por ícono (tree-shakeable), pero su
  // barrel file de entrada es grande: esto evita que el bundler lo procese
  // entero en dev/build y solo resuelve los módulos de los íconos usados.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // ESLint corre como su propio paso independiente (`npm run lint`, ya
  // integrado en el pipeline de CI): antes de que existiera eslint.config.mjs
  // Next.js no tenía nada que lintear durante `next build` y este siempre
  // pasaba; con la config ya creada, `next build` empezó a bloquearse por su
  // propio gate de ESLint interno, duplicando (y acoplando al build) lo que
  // ya cubre el paso de lint del pipeline. Se desactiva aquí para no romper
  // el comportamiento de build ya existente.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
