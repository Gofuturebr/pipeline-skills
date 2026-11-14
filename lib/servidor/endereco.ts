import { networkInterfaces } from "node:os";

// Endereço que os celulares usam para abrir o sistema (QR da mesa).
//
// 1. Se URL_PUBLICA estiver definida, vale ela (por exemplo, o endereço na Vercel).
// 2. Se o navegador abriu por "localhost", o celular não alcança esse endereço:
//    usamos o endereço do computador na rede Wi-Fi, como o "Network" do Next.
// 3. Nos outros casos, o mesmo endereço que o navegador usou.

function ipDaRede(): string | null {
  for (const lista of Object.values(networkInterfaces())) {
    for (const i of lista ?? []) {
      if (i.family === "IPv4" && !i.internal) return i.address;
    }
  }
  return null;
}

const LOCAIS = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);

export function enderecoPublico(cabecalhos: Headers): string {
  const configurado = process.env.URL_PUBLICA?.trim();
  if (configurado) return configurado.replace(/\/+$/, "");
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host") ?? "localhost:3000";
  const protocolo = cabecalhos.get("x-forwarded-proto")?.split(",")[0] ?? "http";
  const porta = host.match(/:(\d+)$/)?.[1];
  const nome = porta ? host.slice(0, -(porta.length + 1)) : host;
  if (LOCAIS.has(nome)) {
    const ip = ipDaRede();
    if (ip) return `http://${ip}${porta ? `:${porta}` : ""}`;
  }
  return `${protocolo}://${host}`;
}

export function enderecoDoParticipante(cabecalhos: Headers, codigo: string): string {
  return `${enderecoPublico(cabecalhos)}/p/${codigo}`;
}
