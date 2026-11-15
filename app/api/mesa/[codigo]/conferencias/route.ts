import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { salvarConferencia } from "@/lib/servidor/conferencias";
import { erro, lerCorpo } from "@/lib/servidor/http";
import { comMesa, responderEstado } from "@/lib/servidor/rota-mesa";

const Corpo = z.object({
  id: z.uuid().nullable().optional(),
  descricao: z.string().max(400),
  fonte: z.string().max(300),
});

// Cria ou altera uma conferência. A validação da RN08 grava o motivo da recusa.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/conferencias">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const r = await salvarConferencia(obterSql(), mesa.id, corpo.dados);
    if (!r.ok) return erro(r.motivo, r.status);
    return responderEstado(mesa.codigo);
  });
}
