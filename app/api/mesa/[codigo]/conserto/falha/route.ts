import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { escolherFalha } from "@/lib/servidor/conserto";
import { erro, lerCorpo } from "@/lib/servidor/http";
import { comMesa, responderEstado } from "@/lib/servidor/rota-mesa";

const Corpo = z.object({ resultadoId: z.uuid().nullable(), texto: z.string().max(1000).optional() });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/conserto/falha">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const d = corpo.dados;
    const r = await escolherFalha(obterSql(), mesa.id, d);
    if (!r.ok) return erro(r.motivo, r.status);
    return responderEstado(mesa.codigo);
  });
}
