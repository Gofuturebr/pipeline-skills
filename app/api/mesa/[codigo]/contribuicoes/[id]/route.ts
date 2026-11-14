import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { decidirContribuicao } from "@/lib/servidor/atividades";
import { erro, lerCorpo } from "@/lib/servidor/http";
import { comMesa, responderEstado } from "@/lib/servidor/rota-mesa";

const Corpo = z.object({ estado: z.enum(["aceita", "descartada", "pendente"]) });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/contribuicoes/[id]">) {
  const { id } = await ctx.params;
  return comMesa(ctx.params, async (mesa) => {
    if (!z.uuid().safeParse(id).success) return erro("Envio não encontrado.", 404);
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const r = await decidirContribuicao(obterSql(), mesa, id, corpo.dados.estado);
    if (!r.ok) return erro(r.motivo, r.status);
    return responderEstado(mesa.codigo);
  });
}
