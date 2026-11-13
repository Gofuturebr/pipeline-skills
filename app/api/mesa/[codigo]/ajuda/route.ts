import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { pedirAjuda } from "@/lib/servidor/acoes";
import { erro, lerCorpo } from "@/lib/servidor/http";
import { comMesa, responderEstado } from "@/lib/servidor/rota-mesa";

const Corpo = z.object({ abrir: z.boolean() });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/ajuda">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const r = await pedirAjuda(obterSql(), mesa.id, corpo.dados.abrir);
    if (!r.ok) return erro(r.motivo, r.status);
    return responderEstado(mesa.codigo);
  });
}
