import type { NextRequest } from "next/server";
import { obterSql } from "@/lib/servidor/db";
import { eventoAtual } from "@/lib/servidor/consultas";
import { montarPainel } from "@/lib/servidor/painel";
import { erro, exigirAdmin, ok, protegida } from "@/lib/servidor/http";

export async function GET(req: NextRequest) {
  const acesso = exigirAdmin(req);
  if (!acesso.ok) return acesso.resposta;
  return protegida(async () => {
    const sql = obterSql();
    const evento = await eventoAtual(sql);
    if (!evento) return erro("Nenhum evento cadastrado.", 404);
    const painel = await montarPainel(sql, evento.id);
    return painel
      ? ok({ ...painel, sessao: { perfil: acesso.sessao.perfil, nome: acesso.sessao.nome } })
      : erro("Evento não encontrado.", 404);
  });
}
