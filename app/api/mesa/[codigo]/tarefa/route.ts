import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { confirmarTarefa } from "@/lib/servidor/atividades";
import { erro, lerCorpo } from "@/lib/servidor/http";
import { comMesa, responderEstado } from "@/lib/servidor/rota-mesa";

const Corpo = z.object({ texto: z.string().max(500) });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/tarefa">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const r = await confirmarTarefa(obterSql(), mesa.id, corpo.dados.texto);
    if (!r.ok) return erro(r.motivo, r.status);
    return responderEstado(mesa.codigo);
  });
}
