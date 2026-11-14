import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { definirPapel } from "@/lib/servidor/atividades";
import { erro, lerCorpo } from "@/lib/servidor/http";
import { comMesa, responderEstado } from "@/lib/servidor/rota-mesa";
import { PAPEIS } from "@/lib/jornada";

const Corpo = z.object({
  papel: z.enum(PAPEIS),
  nome: z.string().max(200),
  participanteId: z.uuid().nullable().optional(),
});

export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/papel">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const { papel, nome, participanteId } = corpo.dados;
    const r = await definirPapel(obterSql(), mesa.id, papel, nome, participanteId ?? null);
    if (!r.ok) return erro(r.motivo, r.status);
    return responderEstado(mesa.codigo);
  });
}
