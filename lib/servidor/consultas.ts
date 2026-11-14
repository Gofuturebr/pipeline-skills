import type { Sql } from "./db";
import type { PapelDoPasso, TipoAtividade } from "@/lib/jornada";
import type { EstadoBase, ModoLiberacao } from "@/lib/maquina";
import type { EventoApi, RelogioApi } from "@/lib/tipos-api";

// Leituras usadas por várias rotas. Uma conexão qualquer (ou transação) serve.

export interface LinhaEvento {
  id: string;
  nome: string;
  data: Date | string;
  modo_liberacao: ModoLiberacao;
  fase_referencia: number;
  iniciado_em: Date | null;
  pausa_geral_ate: Date | null;
  duracao_intervalo_min: number;
}

export interface LinhaMesa {
  id: string;
  evento_id: string;
  numero: number;
  nome: string;
  codigo: string;
  processo_id: string | null;
  processo_nome: string | null;
  fase_atual: number;
  passo_atual: number;
  estado: EstadoBase;
  estado_antes_pausa: Exclude<EstadoBase, "pausada"> | null;
  fase_iniciada_em: Date;
  pausada_desde: Date | null;
  pausa_acumulada_s: number;
  ajuste_tempo_s: number;
  reaberta_em: Date | null;
  tarefa: string;
  final: boolean;
  versao: number;
}

export interface LinhaPasso {
  id: string;
  fase_ordem: number;
  ordem: number;
  chave: string;
  instrucao: string;
  papel: PapelDoPasso;
  tipo_atividade: TipoAtividade;
  criterio: string;
  config: Record<string, unknown>;
  permite_editar: boolean;
}

export interface LinhaFase {
  id: string;
  ordem: number;
  chave: string;
  nome: string;
  nome_curto: string;
  duracao_min: number;
  entrega: string;
  criterio: string;
  criterio_texto: string;
  aprofundamento: string;
  rotulo_contribuicao: string;
}

export interface Roteiro {
  fases: LinhaFase[];
  passosPorFase: Map<number, LinhaPasso[]>;
}

const COLUNAS_MESA = (sql: Sql) => sql`
  m.id, m.evento_id, m.numero, m.nome, m.codigo, m.processo_id, p.nome as processo_nome,
  m.fase_atual, m.passo_atual, m.estado, m.estado_antes_pausa, m.fase_iniciada_em,
  m.pausada_desde, m.pausa_acumulada_s, m.ajuste_tempo_s, m.reaberta_em, m.tarefa,
  m.final, m.versao`;

export function normalizarCodigo(codigo: string): string {
  return codigo.replace(/[\s-]/g, "").toUpperCase().slice(0, 16);
}

export async function mesaPorCodigo(sql: Sql, codigo: string): Promise<LinhaMesa | null> {
  const [m] = await sql<LinhaMesa[]>`
    select ${COLUNAS_MESA(sql)} from mesa m left join processo p on p.id = m.processo_id
    where m.codigo = ${normalizarCodigo(codigo)}`;
  return m ?? null;
}

export async function mesaPorId(sql: Sql, id: string): Promise<LinhaMesa | null> {
  const [m] = await sql<LinhaMesa[]>`
    select ${COLUNAS_MESA(sql)} from mesa m left join processo p on p.id = m.processo_id
    where m.id = ${id}`;
  return m ?? null;
}

export async function mesasDoEvento(sql: Sql, eventoId: string): Promise<LinhaMesa[]> {
  return sql<LinhaMesa[]>`
    select ${COLUNAS_MESA(sql)} from mesa m left join processo p on p.id = m.processo_id
    where m.evento_id = ${eventoId} order by m.numero`;
}

export async function eventoPorId(sql: Sql, id: string): Promise<LinhaEvento | null> {
  const [e] = await sql<LinhaEvento[]>`
    select id, nome, data, modo_liberacao, fase_referencia, iniciado_em, pausa_geral_ate,
           duracao_intervalo_min
    from evento where id = ${id}`;
  return e ?? null;
}

/** O evento em uso: o mais recente. A v1 roda um evento por vez. */
export async function eventoAtual(sql: Sql): Promise<LinhaEvento | null> {
  const [e] = await sql<{ id: string }[]>`select id from evento order by criado_em desc limit 1`;
  return e ? eventoPorId(sql, e.id) : null;
}

export async function roteiroDoEvento(sql: Sql, eventoId: string): Promise<Roteiro> {
  const fases = await sql<LinhaFase[]>`
    select id, ordem, chave, nome, nome_curto, duracao_min, entrega, criterio, criterio_texto,
           aprofundamento, rotulo_contribuicao
    from fase where evento_id = ${eventoId} order by ordem`;
  const passos = await sql<LinhaPasso[]>`
    select p.id, f.ordem as fase_ordem, p.ordem, p.chave, p.instrucao, p.papel, p.tipo_atividade,
           p.criterio, p.config, p.permite_editar
    from passo p join fase f on f.id = p.fase_id
    where f.evento_id = ${eventoId} order by f.ordem, p.ordem`;
  const passosPorFase = new Map<number, LinhaPasso[]>();
  for (const p of passos) {
    const lista = passosPorFase.get(p.fase_ordem) ?? [];
    lista.push(p);
    passosPorFase.set(p.fase_ordem, lista);
  }
  return { fases, passosPorFase };
}

export async function passosConcluidos(sql: Sql, mesaId: string): Promise<Set<string>> {
  const linhas = await sql<{ passo_id: string }[]>`
    select passo_id from passo_concluido where mesa_id = ${mesaId}`;
  return new Set(linhas.map((l) => l.passo_id));
}

export function iso(d: Date | string | null): string | null {
  if (d === null) return null;
  return typeof d === "string" ? d : d.toISOString();
}

export function eventoParaApi(e: LinhaEvento): EventoApi {
  const data = typeof e.data === "string" ? e.data : e.data.toISOString().slice(0, 10);
  return {
    id: e.id,
    nome: e.nome,
    data,
    modoLiberacao: e.modo_liberacao,
    faseReferencia: e.fase_referencia,
    iniciadoEm: iso(e.iniciado_em),
    pausaGeralAte: iso(e.pausa_geral_ate),
    duracaoIntervaloMin: e.duracao_intervalo_min,
  };
}

export function relogioDaMesa(m: LinhaMesa, duracaoMin: number): RelogioApi {
  return {
    faseIniciadaEm: iso(m.fase_iniciada_em) as string,
    pausadaDesde: iso(m.pausada_desde),
    pausaAcumuladaS: m.pausa_acumulada_s,
    ajusteTempoS: m.ajuste_tempo_s,
    duracaoMin,
  };
}
