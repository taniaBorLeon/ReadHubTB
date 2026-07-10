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
};

export default nextConfig;
