import type { NextRequest } from "next/server";
import { obterSql } from "@/lib/servidor/db";
import { destravarSkill } from "@/lib/servidor/entrega";
import { exigirAdmin, protegida, respostaDe } from "@/lib/servidor/http";

// RN15: só o gestor destrava uma skill marcada como final.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/admin/mesas/[id]/destravar">) {
  const acesso = exigirAdmin(req, "destravar");
  if (!acesso.ok) return acesso.resposta;
  return protegida(async () => respostaDe(await destravarSkill(obterSql(), (await ctx.params).id, acesso.autor)));
}
