import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { editarSecao } from "@/lib/servidor/edicao";
import { erro, lerCorpo } from "@/lib/servidor/http";
import { comMesa, responderEstado } from "@/lib/servidor/rota-mesa";

const Corpo = z.object({
  caminho: z.string().max(120),
  /** null edita o título (linha "# ..."). */
  secao: z.string().max(120).nullable(),
  corpo: z.string().max(30000),
  versao: z.number().int().positive(),
});

export async function POST(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/arquivos/secao">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const { caminho, secao, versao } = corpo.dados;
    const r = await editarSecao(obterSql(), mesa.id, caminho, secao, corpo.dados.corpo, versao);
    if (!r.ok) return erro(r.motivo, r.status);
    return responderEstado(mesa.codigo);
  });
}
