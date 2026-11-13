import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { eventoAtual } from "@/lib/servidor/consultas";
import {
  ajustarTempoTodas,
  avancarProntas,
  avancarTodas,
  enviarAviso,
  pausarTodas,
  retomarTodas,
} from "@/lib/servidor/acoes";
import { erro, exigirAdmin, lerCorpo, respostaDe } from "@/lib/servidor/http";
import type { AcaoAdmin } from "@/lib/permissoes";

const PERMISSAO: Record<string, AcaoAdmin> = {
  "avancar-prontas": "avancar_prontas",
  "avancar-todas": "avancar_todas",
  pausar: "pausar_todas",
  retomar: "retomar_todas",
  tempo: "ajustar_tempo_todas",
  aviso: "aviso_todas",
};

const CorpoPausa = z.object({ minutos: z.number().int().optional() });
const CorpoTempo = z.object({ minutos: z.number().int() });
const CorpoAviso = z.object({ texto: z.string() });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/admin/todas/[acao]">) {
  const { acao } = await ctx.params;
  const permissao = PERMISSAO[acao];
  if (!permissao) return erro("Ação desconhecida.", 404);
  const acesso = exigirAdmin(req, permissao);
  if (!acesso.ok) return acesso.resposta;
  const sql = obterSql();
  const evento = await eventoAtual(sql);
  if (!evento) return erro("Nenhum evento cadastrado.", 404);
  const autor = acesso.autor;

  switch (acao) {
    case "avancar-prontas":
      return respostaDe(await avancarProntas(sql, evento.id, autor));
    case "avancar-todas":
      return respostaDe(await avancarTodas(sql, evento.id, autor));
    case "pausar": {
      const corpo = await lerCorpo(req, CorpoPausa);
      if (!corpo.ok) return corpo.resposta;
      return respostaDe(await pausarTodas(sql, evento.id, corpo.dados.minutos ?? null, autor));
    }
    case "retomar":
      return respostaDe(await retomarTodas(sql, evento.id, autor));
    case "tempo": {
      const corpo = await lerCorpo(req, CorpoTempo);
      if (!corpo.ok) return corpo.resposta;
      return respostaDe(await ajustarTempoTodas(sql, evento.id, corpo.dados.minutos, autor));
    }
    default: {
      const corpo = await lerCorpo(req, CorpoAviso);
      if (!corpo.ok) return corpo.resposta;
      return respostaDe(await enviarAviso(sql, evento.id, null, corpo.dados.texto, autor));
    }
  }
}
