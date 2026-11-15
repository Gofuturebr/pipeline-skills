import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { enviarRelatorio } from "@/lib/servidor/teste";
import { erro, lerCorpo } from "@/lib/servidor/http";
import { comMesa, responderEstado } from "@/lib/servidor/rota-mesa";

const Corpo = z.object({});

export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/teste/enviar">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const r = await enviarRelatorio(obterSql(), mesa.id);
    if (!r.ok) return erro(r.motivo, r.status);
    return responderEstado(mesa.codigo);
  });
}
