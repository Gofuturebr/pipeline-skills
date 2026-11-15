import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// No `npm run dev`, o Next bloqueia quem abre o servidor por um endereço que não
// é localhost: o celular que lê o QR pelo IP da rede Wi-Fi ficava parado em
// "Abrindo a mesa". Liberamos os endereços deste computador e as faixas de rede
// local. Só vale em desenvolvimento; o `npm start` não tem esse bloqueio.
function enderecosDaRede(): string[] {
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i!.address);
  const privadas = ["192.168.*.*", "10.*.*.*", ...Array.from({ length: 16 }, (_, n) => `172.${16 + n}.*.*`)];
  return [...new Set([...ips, ...privadas])];
}

// Cache Components desligado: todas as telas mostram estado ao vivo, buscado
// pelo navegador nas rotas de API. Ver docs/decisoes.md.
const nextConfig: NextConfig = {
  cacheComponents: false,
  partialPrefetching: false,
  allowedDevOrigins: enderecosDaRede(),
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
