import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { turnoDaEntrevista } from "@/lib/servidor/entrevista";
import { lerCorpo } from "@/lib/servidor/http";
import { comMesa } from "@/lib/servidor/rota-mesa";
import { fluxoDaMesa } from "@/lib/servidor/rota-fluxo";

export const maxDuration = 120;

const Corpo = z.object({ resposta: z.string().max(20000).optional() });

// Guarda a resposta da mesa e devolve, aos poucos, a próxima pergunta da IA.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/entrevista/turno">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    return fluxoDaMesa(mesa.codigo, (aoTexto) => turnoDaEntrevista(obterSql(), mesa.id, corpo.dados.resposta, aoTexto));
  });
}
