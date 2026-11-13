import type { NextRequest } from "next/server";
import { obterSql } from "@/lib/servidor/db";
import { montarCartaoDaMesa } from "@/lib/servidor/painel";
import { erro, exigirAdmin, ok } from "@/lib/servidor/http";

/** Cartão de uma mesa, para o painel atualizar só o que mudou. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/admin/mesas/[id]">) {
  const acesso = exigirAdmin(req);
  if (!acesso.ok) return acesso.resposta;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return erro("Mesa não encontrada.", 404);
  const cartao = await montarCartaoDaMesa(obterSql(), id);
  return cartao ? ok(cartao) : erro("Mesa não encontrada.", 404);
}
