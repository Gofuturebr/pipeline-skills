import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { marcarLeitura } from "@/lib/servidor/atividades";
import { erro, lerCorpo } from "@/lib/servidor/http";
import { comMesa, responderEstado } from "@/lib/servidor/rota-mesa";

const Corpo = z.object({ passoId: z.uuid(), lido: z.boolean() });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/leitura">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const r = await marcarLeitura(obterSql(), mesa.id, corpo.dados.passoId, corpo.dados.lido);
    if (!r.ok) return erro(r.motivo, r.status);
    return responderEstado(mesa.codigo);
  });
}
