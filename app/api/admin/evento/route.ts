import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { eventoAtual } from "@/lib/servidor/consultas";
import { configurarEvento } from "@/lib/servidor/acoes";
import { erro, exigirAdmin, lerCorpo, respostaDe } from "@/lib/servidor/http";

const Corpo = z.object({
  modoLiberacao: z.enum(["manual", "automatico"]).optional(),
  faseReferencia: z.number().int().min(0).max(7).optional(),
  iniciar: z.literal(true).optional(),
});

export async function PUT(req: NextRequest) {
  const acesso = exigirAdmin(req, "configurar_evento");
  if (!acesso.ok) return acesso.resposta;
  const corpo = await lerCorpo(req, Corpo);
  if (!corpo.ok) return corpo.resposta;
  const sql = obterSql();
  const evento = await eventoAtual(sql);
  if (!evento) return erro("Nenhum evento cadastrado.", 404);
  return respostaDe(await configurarEvento(sql, evento.id, corpo.dados, acesso.autor));
}
