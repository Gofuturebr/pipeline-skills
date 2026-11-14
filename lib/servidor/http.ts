import type { NextRequest } from "next/server";
import type { z } from "zod";
import { COOKIE_ADMIN, lerSessao, type SessaoAdmin } from "./sessao-admin";
import { pode, type AcaoAdmin } from "@/lib/permissoes";
import type { Autor, Resultado } from "./acoes";

export function erro(mensagem: string, status = 400): Response {
  return Response.json({ erro: mensagem }, { status, headers: { "Cache-Control": "no-store" } });
}

// Códigos de erro do Postgres e da rede que querem dizer "o banco não respondeu":
// conexão recusada, senha errada, banco inexistente, tabela inexistente, queda.
const FALHA_DE_BANCO = /^(ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|CONNECT_TIMEOUT|CONNECTION_\w+|28P01|28000|3D000|42P01|57P0[1-3]|08\w{3})$/;

export const MSG_FALHA_BANCO = "O sistema não conseguiu falar com o banco de dados. Avisem o gestor.";

/**
 * Executa a rota e transforma falhas inesperadas numa resposta com mensagem.
 * O detalhe técnico vai para o terminal do servidor.
 */
export async function protegida(executar: () => Promise<Response>): Promise<Response> {
  try {
    return await executar();
  } catch (e) {
    console.error(e);
    const codigo = String((e as { code?: unknown })?.code ?? "");
    if (FALHA_DE_BANCO.test(codigo)) return erro(MSG_FALHA_BANCO, 503);
    return erro("Algo deu errado no servidor. Tentem de novo.", 500);
  }
}

export function ok<T>(dados: T, status = 200): Response {
  return Response.json(dados, { status, headers: { "Cache-Control": "no-store" } });
}

export async function lerCorpo<T extends z.ZodType>(
  req: Request,
  esquema: T,
): Promise<{ ok: true; dados: z.infer<T> } | { ok: false; resposta: Response }> {
  const bruto = await req.json().catch(() => null);
  const r = esquema.safeParse(bruto ?? {});
  if (!r.success) return { ok: false, resposta: erro("Dados inválidos.") };
  return { ok: true, dados: r.data };
}

export function sessaoDaRequisicao(req: NextRequest): SessaoAdmin | null {
  return lerSessao(req.cookies.get(COOKIE_ADMIN)?.value);
}

/** Exige sessão do admin com permissão para a ação. */
export function exigirAdmin(
  req: NextRequest,
  acao?: AcaoAdmin,
): { ok: true; sessao: SessaoAdmin; autor: Autor } | { ok: false; resposta: Response } {
  const sessao = sessaoDaRequisicao(req);
  if (!sessao) return { ok: false, resposta: erro("Entre no admin com a senha.", 401) };
  if (acao && !pode(sessao.perfil, acao)) {
    return { ok: false, resposta: erro("Seu perfil não pode fazer esta ação.", 403) };
  }
  return { ok: true, sessao, autor: { perfil: sessao.perfil, nome: sessao.nome } };
}

export function respostaDe<T>(r: Resultado<T>): Response {
  if (!r.ok) return erro(r.motivo, r.status);
  return ok({ ok: true, ...(r.dados ? { resultado: r.dados } : {}) });
}
