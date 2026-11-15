import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { aprovarConserto } from "@/lib/servidor/conserto";
import { erro, lerCorpo } from "@/lib/servidor/http";
import { comMesa, responderEstado } from "@/lib/servidor/rota-mesa";

const Corpo = z.object({
  conteudoNovo: z.string().max(60000).optional(),
  oQueMuda: z.string().max(1000).optional(),
  novaConferencia: z.object({ descricao: z.string().max(400), fonte: z.string().max(300) }).optional(),
});

export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/conserto/aprovar">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const d = corpo.dados;
    const r = await aprovarConserto(obterSql(), mesa.id, d);
    if (!r.ok) return erro(r.motivo, r.status);
    return responderEstado(mesa.codigo);
  });
}
