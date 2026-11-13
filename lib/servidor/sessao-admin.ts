import { createHmac, timingSafeEqual } from "node:crypto";
import type { Perfil } from "@/lib/permissoes";

// Sessão do admin num cookie assinado com HMAC. Sem banco e sem dependência.

export const COOKIE_ADMIN = "mesa_admin";
const DURACAO_MS = 12 * 60 * 60 * 1000;

export interface SessaoAdmin {
  perfil: Perfil;
  nome: string;
  expira: number;
}

function segredo(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET não configurado ou curto demais (mínimo 16 caracteres).");
  }
  return s;
}

function assinar(corpo: string): string {
  return createHmac("sha256", segredo()).update(corpo).digest("base64url");
}

function iguais(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function criarSessao(perfil: Perfil, nome: string, agora = Date.now()): string {
  const corpo = Buffer.from(
    JSON.stringify({ perfil, nome, expira: agora + DURACAO_MS } satisfies SessaoAdmin),
  ).toString("base64url");
  return `${corpo}.${assinar(corpo)}`;
}

export function lerSessao(valor: string | undefined | null, agora = Date.now()): SessaoAdmin | null {
  if (!valor) return null;
  const [corpo, assinatura] = valor.split(".");
  if (!corpo || !assinatura) return null;
  if (!iguais(assinar(corpo), assinatura)) return null;
  try {
    const s = JSON.parse(Buffer.from(corpo, "base64url").toString()) as SessaoAdmin;
    if (s.perfil !== "gestor" && s.perfil !== "facilitador") return null;
    if (typeof s.expira !== "number" || s.expira < agora) return null;
    return s;
  } catch {
    return null;
  }
}

/** Descobre o perfil pela senha. Senha vazia no ambiente nunca dá acesso. */
export function perfilPelaSenha(senha: string): Perfil | null {
  const gestor = process.env.ADMIN_PASSWORD ?? "";
  const facilitador = process.env.FACILITADOR_PASSWORD ?? "";
  if (gestor && iguais(senha, gestor)) return "gestor";
  if (facilitador && iguais(senha, facilitador)) return "facilitador";
  return null;
}

export const DURACAO_SESSAO_S = DURACAO_MS / 1000;
