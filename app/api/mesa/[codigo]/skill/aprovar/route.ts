import type { NextRequest } from "next/server";
import { obterSql } from "@/lib/servidor/db";
import { aprovarSkill } from "@/lib/servidor/entrevista";
import { erro } from "@/lib/servidor/http";
import { comMesa, responderEstado } from "@/lib/servidor/rota-mesa";

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/skill/aprovar">) {
  return comMesa(ctx.params, async (mesa) => {
    const r = await aprovarSkill(obterSql(), mesa.id);
    if (!r.ok) return erro(r.motivo, r.status);
    return responderEstado(mesa.codigo);
  });
}
