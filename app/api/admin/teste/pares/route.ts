import type { NextRequest } from "next/server";
import { obterSql } from "@/lib/servidor/db";
import { eventoAtual } from "@/lib/servidor/consultas";
import { formarPares } from "@/lib/servidor/teste";
import { erro, exigirAdmin, ok, protegida } from "@/lib/servidor/http";

// "Iniciar teste cruzado": forma os pares das mesas (RN10). Só o gestor.
export async function POST(req: NextRequest) {
  const acesso = exigirAdmin(req, "teste_cruzado");
  if (!acesso.ok) return acesso.resposta;
  return protegida(async () => {
    const sql = obterSql();
    const evento = await eventoAtual(sql);
    if (!evento) return erro("Nenhum evento cadastrado.", 404);
    const r = await formarPares(sql, evento.id, acesso.autor);
    if (!r.ok) return erro(r.motivo, r.status);
    return ok({ ok: true, pares: r.dados!.pares });
  });
}
