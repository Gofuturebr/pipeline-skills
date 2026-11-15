import type { NextRequest } from "next/server";
import { obterSql } from "@/lib/servidor/db";
import { proporConserto } from "@/lib/servidor/conserto";
import { comMesa } from "@/lib/servidor/rota-mesa";
import { fluxoDaMesa } from "@/lib/servidor/rota-fluxo";

export const maxDuration = 300;

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/conserto/propor">) {
  return comMesa(ctx.params, async (mesa) => fluxoDaMesa(mesa.codigo, (aoTexto) => proporConserto(obterSql(), mesa.id, aoTexto)));
}
