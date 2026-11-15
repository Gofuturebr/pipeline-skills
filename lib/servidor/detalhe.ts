import type { Sql } from "./db";
import { iso, mesaPorId } from "./consultas";
import { arquivosDaMesa } from "./arquivos";
import { montarTeste } from "./teste";
import type { DetalheMesaApi } from "@/lib/tipos-api";

// Detalhe da mesa no painel do gestor: pasta, conversa, linha do tempo e teste
// cruzado, em modo leitura (seção 5 da especificação).

export async function montarDetalhe(sql: Sql, mesaId: string): Promise<DetalheMesaApi | null> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) return null;
  const [arquivos, mensagens, registros, chamados, contribuicoes, teste] = await Promise.all([
    arquivosDaMesa(sql, mesa.id),
    sql<{ autor: string; texto: string; fase: number; tipo: string; criado_em: Date }[]>`
      select autor, texto, fase, tipo, criado_em from mensagem where mesa_id = ${mesa.id} order by criado_em, id`,
    sql<{ acao: string; autor_perfil: string; autor_nome: string; detalhes: Record<string, unknown>; criado_em: Date }[]>`
      select acao, autor_perfil, autor_nome, detalhes, criado_em from registro
      where mesa_id = ${mesa.id} order by criado_em`,
    sql<{ fase: number; passo: number; estado: string; aberto_em: Date; atendido_por: string | null; atendido_em: Date | null }[]>`
      select fase, passo, estado, aberto_em, atendido_por, atendido_em from chamado
      where mesa_id = ${mesa.id} order by aberto_em`,
    sql<{ texto: string; estado: string; fase: number; criado_em: Date }[]>`
      select texto, estado, fase, criado_em from contribuicao where mesa_id = ${mesa.id} order by criado_em`,
    mesa.fase_atual >= 5 ? montarTeste(sql, mesa) : Promise.resolve(null),
  ]);
  return {
    mesaId: mesa.id,
    arquivos,
    conversa: mensagens.map((m) => ({
      autor: m.autor as "mesa" | "ia",
      texto: m.texto,
      fase: m.fase,
      tipo: m.tipo,
      criadoEm: iso(m.criado_em) as string,
    })),
    contribuicoes: contribuicoes.map((c) => ({ texto: c.texto, estado: c.estado, fase: c.fase, criadoEm: iso(c.criado_em) as string })),
    linhaDoTempo: registros.map((r) => ({
      acao: r.acao,
      autorPerfil: r.autor_perfil,
      autorNome: r.autor_nome,
      detalhes: r.detalhes ?? {},
      criadoEm: iso(r.criado_em) as string,
    })),
    chamados: chamados.map((c) => ({
      fase: c.fase,
      passo: c.passo,
      estado: c.estado,
      abertoEm: iso(c.aberto_em) as string,
      atendidoPor: c.atendido_por,
      atendidoEm: iso(c.atendido_em),
    })),
    teste: teste ? { ...teste, pastaParceira: [] } : null,
  };
}
