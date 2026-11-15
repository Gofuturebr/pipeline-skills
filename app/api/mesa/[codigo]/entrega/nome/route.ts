import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { confirmarNome } from "@/lib/servidor/entrega";
import { erro, lerCorpo } from "@/lib/servidor/http";
import { comMesa, responderEstado } from "@/lib/servidor/rota-mesa";

const Corpo = z.object({ nome: z.string().max(200) });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/entrega/nome">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const d = corpo.dados;
    const r = await confirmarNome(obterSql(), mesa.id, d.nome);
    if (!r.ok) return erro(r.motivo, r.status);
    return responderEstado(mesa.codigo);
  });
}
