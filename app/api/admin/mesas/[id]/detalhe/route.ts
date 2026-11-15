import type { NextRequest } from "next/server";
import { obterSql } from "@/lib/servidor/db";
import { montarDetalhe } from "@/lib/servidor/detalhe";
import { erro, exigirAdmin, ok, protegida } from "@/lib/servidor/http";

// "Ver pasta" (seção 5): pasta, conversa, linha do tempo e teste, em leitura. Só o gestor.
export async function GET(req: NextRequest, ctx: RouteContext<"/api/admin/mesas/[id]/detalhe">) {
  const acesso = exigirAdmin(req, "ver_pasta");
  if (!acesso.ok) return acesso.resposta;
  return protegida(async () => {
    const { id } = await ctx.params;
    if (!/^[0-9a-f-]{36}$/.test(id)) return erro("Mesa não encontrada.", 404);
    const d = await montarDetalhe(obterSql(), id);
    return d ? ok(d) : erro("Mesa não encontrada.", 404);
  });
}
