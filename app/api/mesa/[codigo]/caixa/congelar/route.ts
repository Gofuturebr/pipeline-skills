import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { congelar } from "@/lib/servidor/rodadas";
import { erro, lerCorpo, ok } from "@/lib/servidor/http";
import { comMesa } from "@/lib/servidor/rota-mesa";

export const maxDuration = 120;

const Corpo = z.object({ trecho: z.string().max(8000) });

// A IA propõe o modelo com lacunas. Nada é salvo até a mesa confirmar (RN13).
export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/caixa/congelar">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const r = await congelar(obterSql(), mesa.id, corpo.dados.trecho);
    if (!r.ok) return erro(r.motivo, r.status);
    return ok({ proposta: r.dados });
  });
}
