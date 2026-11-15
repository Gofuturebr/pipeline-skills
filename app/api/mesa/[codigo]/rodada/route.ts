import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { rodar } from "@/lib/servidor/rodadas";
import { lerCorpo } from "@/lib/servidor/http";
import { comMesa } from "@/lib/servidor/rota-mesa";
import { fluxoDaMesa } from "@/lib/servidor/rota-fluxo";

export const maxDuration = 300;

const Corpo = z.object({ tipo: z.enum(["exemplo", "segunda"]) });

// Fase 3: o Claude usa a pasta para fazer a tarefa com o caso de exemplo.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/rodada">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    return fluxoDaMesa(mesa.codigo, (aoTexto) => rodar(obterSql(), mesa.id, corpo.dados.tipo, aoTexto));
  });
}
