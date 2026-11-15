import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { escolherCamada } from "@/lib/servidor/conserto";
import { erro, lerCorpo } from "@/lib/servidor/http";
import { comMesa, responderEstado } from "@/lib/servidor/rota-mesa";

const Corpo = z.object({ camada: z.enum(["processo", "caixa", "prova"]) });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/conserto/camada">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const d = corpo.dados;
    const r = await escolherCamada(obterSql(), mesa.id, d.camada);
    if (!r.ok) return erro(r.motivo, r.status);
    return responderEstado(mesa.codigo);
  });
}
