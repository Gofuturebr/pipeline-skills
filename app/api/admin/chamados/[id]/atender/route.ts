import type { NextRequest } from "next/server";
import { obterSql } from "@/lib/servidor/db";
import { atenderChamado } from "@/lib/servidor/acoes";
import { erro, exigirAdmin, respostaDe } from "@/lib/servidor/http";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/admin/chamados/[id]/atender">) {
  const acesso = exigirAdmin(req, "atender_chamado");
  if (!acesso.ok) return acesso.resposta;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return erro("Chamado não encontrado.", 404);
  return respostaDe(await atenderChamado(obterSql(), id, acesso.autor));
}
