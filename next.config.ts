import type { NextConfig } from "next";

// Cache Components desligado: todas as telas mostram estado ao vivo, buscado
// pelo navegador nas rotas de API. Ver docs/decisoes.md.
const nextConfig: NextConfig = {
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
