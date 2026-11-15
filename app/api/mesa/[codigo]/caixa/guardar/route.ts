import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { guardarModelo } from "@/lib/servidor/rodadas";
import { erro, lerCorpo } from "@/lib/servidor/http";
import { comMesa, responderEstado } from "@/lib/servidor/rota-mesa";

const Corpo = z.object({
  nomeArquivo: z.string().max(120),
  praQueServe: z.string().max(400),
  conteudo: z.string().max(20000),
});

export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/caixa/guardar">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const r = await guardarModelo(obterSql(), mesa.id, corpo.dados);
    if (!r.ok) return erro(r.motivo, r.status);
    return responderEstado(mesa.codigo);
  });
}
