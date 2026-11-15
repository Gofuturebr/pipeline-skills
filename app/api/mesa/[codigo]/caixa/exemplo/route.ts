import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { salvarExemplo } from "@/lib/servidor/rodadas";
import { erro, lerCorpo } from "@/lib/servidor/http";
import { comMesa, responderEstado } from "@/lib/servidor/rota-mesa";

const Corpo = z.object({ rodadaId: z.uuid(), texto: z.string().max(20000) });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/caixa/exemplo">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const r = await salvarExemplo(obterSql(), mesa.id, corpo.dados.rodadaId, corpo.dados.texto);
    if (!r.ok) return erro(r.motivo, r.status);
    return responderEstado(mesa.codigo);
  });
}
