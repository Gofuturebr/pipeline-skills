import type { NextRequest } from "next/server";
import { obterSql } from "@/lib/servidor/db";
import { eventoAtual } from "@/lib/servidor/consultas";
import { dadosDoPreparo } from "@/lib/servidor/preparo";
import { erro, exigirAdmin, ok, protegida } from "@/lib/servidor/http";

export async function GET(req: NextRequest) {
  const acesso = exigirAdmin(req, "preparo");
  if (!acesso.ok) return acesso.resposta;
  return protegida(async () => {
    const sql = obterSql();
    const evento = await eventoAtual(sql);
    if (!evento) return erro("Nenhum evento cadastrado.", 404);
    return ok(await dadosDoPreparo(sql, evento.id));
  });
}
