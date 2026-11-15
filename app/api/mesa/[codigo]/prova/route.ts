import type { NextRequest } from "next/server";
import { obterSql } from "@/lib/servidor/db";
import { rodarProva } from "@/lib/servidor/rodadas";
import { comMesa } from "@/lib/servidor/rota-mesa";
import { fluxoDaMesa } from "@/lib/servidor/rota-fluxo";

export const maxDuration = 300;

// Fase 4: roda a tarefa, a IA confere, conserta o que falhou e devolve o placar.
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/prova">) {
  return comMesa(ctx.params, async (mesa) => fluxoDaMesa(mesa.codigo, (aoTexto) => rodarProva(obterSql(), mesa.id, aoTexto)));
}
