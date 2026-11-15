import type { NextRequest } from "next/server";
import { obterSql } from "@/lib/servidor/db";
import { testar } from "@/lib/servidor/teste";
import { comMesa } from "@/lib/servidor/rota-mesa";
import { fluxoDaMesa } from "@/lib/servidor/rota-fluxo";

export const maxDuration = 300;

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/teste/rodar">) {
  return comMesa(ctx.params, async (mesa) => fluxoDaMesa(mesa.codigo, (aoTexto) => testar(obterSql(), mesa.id, aoTexto)));
}
