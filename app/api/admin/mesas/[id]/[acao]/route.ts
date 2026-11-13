import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { mesaPorId } from "@/lib/servidor/consultas";
import { acaoDeFase, ajustarTempo, enviarAviso } from "@/lib/servidor/acoes";
import { erro, exigirAdmin, lerCorpo, respostaDe } from "@/lib/servidor/http";
import type { AcaoAdmin } from "@/lib/permissoes";

const ACOES = {
  avancar: { permissao: "avancar", fase: "avancar" },
  forcar: { permissao: "forcar", fase: "forcar" },
  voltar: { permissao: "voltar", fase: "voltar" },
  desfazer: { permissao: "desfazer", fase: "desfazer_avanco" },
  pausar: { permissao: "pausar", fase: "pausar" },
  retomar: { permissao: "retomar", fase: "retomar" },
  tempo: { permissao: "ajustar_tempo", fase: null },
  aviso: { permissao: "enviar_aviso", fase: null },
} as const satisfies Record<string, { permissao: AcaoAdmin; fase: string | null }>;

const CorpoTempo = z.object({ minutos: z.number().int() });
const CorpoAviso = z.object({ texto: z.string() });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/admin/mesas/[id]/[acao]">) {
  const { id, acao } = await ctx.params;
  if (!(acao in ACOES)) return erro("Ação desconhecida.", 404);
  const def = ACOES[acao as keyof typeof ACOES];
  const acesso = exigirAdmin(req, def.permissao);
  if (!acesso.ok) return acesso.resposta;
  if (!/^[0-9a-f-]{36}$/.test(id)) return erro("Mesa não encontrada.", 404);

  const sql = obterSql();
  if (def.fase) return respostaDe(await acaoDeFase(sql, id, def.fase, acesso.autor));

  if (acao === "tempo") {
    const corpo = await lerCorpo(req, CorpoTempo);
    if (!corpo.ok) return corpo.resposta;
    return respostaDe(await ajustarTempo(sql, id, corpo.dados.minutos, acesso.autor));
  }
  const corpo = await lerCorpo(req, CorpoAviso);
  if (!corpo.ok) return corpo.resposta;
  const mesa = await mesaPorId(sql, id);
  if (!mesa) return erro("Mesa não encontrada.", 404);
  return respostaDe(await enviarAviso(sql, mesa.evento_id, mesa.id, corpo.dados.texto, acesso.autor));
}
