import type { NextRequest } from "next/server";
import { obterSql } from "@/lib/servidor/db";
import { gerarSkill } from "@/lib/servidor/entrevista";
import { comMesa } from "@/lib/servidor/rota-mesa";
import { fluxoDaMesa } from "@/lib/servidor/rota-fluxo";

export const maxDuration = 300;

// A IA escreve o SKILL.md. Recusado antes de 8 perguntas e dos 8 temas (RN07).
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/skill/gerar">) {
  return comMesa(ctx.params, async (mesa) =>
    fluxoDaMesa(mesa.codigo, (aoTexto) => gerarSkill(obterSql(), mesa.id, aoTexto)),
  );
}
