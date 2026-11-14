import type { NextRequest } from "next/server";
import { obterSql } from "@/lib/servidor/db";
import { ok } from "@/lib/servidor/http";
import { cookieParticipante, montarEstadoCelular, participantePorToken } from "@/lib/servidor/participantes";
import { comMesa } from "@/lib/servidor/rota-mesa";

// Estado do celular. Cada busca também conta como sinal de vida da pessoa.
export async function GET(req: NextRequest, ctx: RouteContext<"/api/p/[codigo]/estado">) {
  return comMesa(ctx.params, async (mesa) => {
    const sql = obterSql();
    const p = await participantePorToken(sql, mesa.id, req.cookies.get(cookieParticipante(mesa.codigo))?.value);
    return ok(await montarEstadoCelular(sql, mesa, p));
  });
}
