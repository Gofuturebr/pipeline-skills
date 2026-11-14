import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { erro, lerCorpo, ok } from "@/lib/servidor/http";
import {
  contribuir,
  cookieParticipante,
  montarEstadoCelular,
  participantePorToken,
} from "@/lib/servidor/participantes";
import { comMesa } from "@/lib/servidor/rota-mesa";

const Corpo = z.object({ texto: z.string().max(2000) });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/p/[codigo]/contribuir">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const sql = obterSql();
    const p = await participantePorToken(sql, mesa.id, req.cookies.get(cookieParticipante(mesa.codigo))?.value);
    if (!p) return erro("Digite seu primeiro nome antes de enviar.", 401);
    const r = await contribuir(sql, mesa, p, corpo.dados.texto);
    if (!r.ok) return erro(r.motivo, r.status);
    return ok(await montarEstadoCelular(sql, mesa, p));
  });
}
