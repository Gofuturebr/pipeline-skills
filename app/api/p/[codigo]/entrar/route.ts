import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { erro, lerCorpo } from "@/lib/servidor/http";
import {
  cookieParticipante,
  entrarParticipante,
  montarEstadoCelular,
  participantePorToken,
} from "@/lib/servidor/participantes";
import { comMesa } from "@/lib/servidor/rota-mesa";

const Corpo = z.object({ nome: z.string().max(200), mesmaPessoa: z.boolean().optional() });
const DOZE_HORAS_S = 12 * 60 * 60;

export async function POST(req: NextRequest, ctx: RouteContext<"/api/p/[codigo]/entrar">) {
  return comMesa(ctx.params, async (mesa) => {
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    const sql = obterSql();
    const r = await entrarParticipante(sql, mesa, corpo.dados.nome, corpo.dados.mesmaPessoa ?? false);
    if (!r.ok) return erro(r.motivo, r.status);
    const token = r.dados!.token;
    const p = await participantePorToken(sql, mesa.id, token);
    const resposta = NextResponse.json(await montarEstadoCelular(sql, mesa, p), {
      headers: { "Cache-Control": "no-store" },
    });
    resposta.cookies.set(cookieParticipante(mesa.codigo), token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: DOZE_HORAS_S,
      secure: req.nextUrl.protocol === "https:",
    });
    return resposta;
  });
}
