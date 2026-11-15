import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { observar } from "@/lib/servidor/teste";
import { erro, lerCorpo } from "@/lib/servidor/http";
import { comMesa, responderEstado } from "@/lib/servidor/rota-mesa";

const Corpo = z.object({ resultadoId: z.uuid(), texto: z.string().max(2000) });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/teste/observar">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const d = corpo.dados;
    const r = await observar(obterSql(), mesa.id, d.resultadoId, d.texto);
    if (!r.ok) return erro(r.motivo, r.status);
    return responderEstado(mesa.codigo);
  });
}
