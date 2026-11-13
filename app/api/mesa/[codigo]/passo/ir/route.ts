import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { irParaPasso } from "@/lib/servidor/acoes";
import { erro, lerCorpo } from "@/lib/servidor/http";
import { comMesa, responderEstado } from "@/lib/servidor/rota-mesa";

const Corpo = z.object({ ordem: z.number().int().min(1) });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/passo/ir">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const r = await irParaPasso(obterSql(), mesa.id, corpo.dados.ordem);
    if (!r.ok) return erro(r.motivo, r.status);
    return responderEstado(mesa.codigo);
  });
}
