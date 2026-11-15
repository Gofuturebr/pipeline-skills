import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { corrigirSkill } from "@/lib/servidor/entrevista";
import { lerCorpo } from "@/lib/servidor/http";
import { comMesa } from "@/lib/servidor/rota-mesa";
import { fluxoDaMesa } from "@/lib/servidor/rota-fluxo";

export const maxDuration = 300;

const Corpo = z.object({ errou: z.string().max(4000), esqueceu: z.string().max(4000) });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/skill/corrigir">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    return fluxoDaMesa(mesa.codigo, (aoTexto) => corrigirSkill(obterSql(), mesa.id, corpo.dados, aoTexto));
  });
}
