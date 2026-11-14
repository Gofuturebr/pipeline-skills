import { NextResponse, type NextRequest } from "next/server";
import { obterSql } from "@/lib/servidor/db";
import { cookieParticipante, montarEstadoCelular } from "@/lib/servidor/participantes";
import { comMesa } from "@/lib/servidor/rota-mesa";

// "Não é você?": o celular esquece a pessoa e volta para o campo do nome.
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/p/[codigo]/sair">) {
  return comMesa(ctx.params, async (mesa) => {
    const resposta = NextResponse.json(await montarEstadoCelular(obterSql(), mesa, null), {
      headers: { "Cache-Control": "no-store" },
    });
    resposta.cookies.delete(cookieParticipante(mesa.codigo));
    return resposta;
  });
}
