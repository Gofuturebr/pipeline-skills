import type { Sql } from "./db";
import {
  eventoParaApi,
  eventoPorId,
  mesaPorId,
  mesasDoEvento,
  relogioDaMesa,
  roteiroDoEvento,
  type LinhaMesa,
  type Roteiro,
} from "./consultas";
import { avaliacaoDaFase } from "./estado-mesa";
import { estadoMostrado, segundosRestantesFase } from "@/lib/tempo";
import type { CartaoMesaApi, PainelApi } from "@/lib/tipos-api";

/** Um celular conta como conectado se mandou sinal nos últimos 45 segundos. */
export const JANELA_CONECTADO_S = 45;

interface Extras {
  chamados: Map<string, string>;
  pessoas: Map<string, number>;
  concluidos: Map<string, Set<string>>;
}

async function extrasDasMesas(sql: Sql, ids: string[]): Promise<Extras> {
  if (ids.length === 0) return { chamados: new Map(), pessoas: new Map(), concluidos: new Map() };
  const [chamados, pessoas, concluidos] = await Promise.all([
    sql<{ mesa_id: string; id: string }[]>`
      select mesa_id, id from chamado where estado = 'aberto' and mesa_id in ${sql(ids)}`,
    sql<{ mesa_id: string; n: number }[]>`
      select mesa_id, count(*)::int as n from participante
      where mesa_id in ${sql(ids)} and ultimo_sinal_em > now() - make_interval(secs => ${JANELA_CONECTADO_S})
      group by mesa_id`,
    sql<{ mesa_id: string; passo_id: string }[]>`
      select mesa_id, passo_id from passo_concluido where mesa_id in ${sql(ids)}`,
  ]);
  const mapaConcluidos = new Map<string, Set<string>>();
  for (const c of concluidos) {
    const s = mapaConcluidos.get(c.mesa_id) ?? new Set<string>();
    s.add(c.passo_id);
    mapaConcluidos.set(c.mesa_id, s);
  }
  return {
    chamados: new Map(chamados.map((c) => [c.mesa_id, c.id])),
    pessoas: new Map(pessoas.map((p) => [p.mesa_id, p.n])),
    concluidos: mapaConcluidos,
  };
}

function montarCartao(m: LinhaMesa, roteiro: Roteiro, extras: Extras, agora: number): CartaoMesaApi {
  const fase = roteiro.fases.find((f) => f.ordem === m.fase_atual);
  const relogio = relogioDaMesa(m, fase?.duracao_min ?? 0);
  const restante = segundosRestantesFase(relogio, relogio.duracaoMin, agora);
  const avaliacao = avaliacaoDaFase(roteiro, m.fase_atual, {
    concluidos: extras.concluidos.get(m.id) ?? new Set(),
  });
  const chamadoId = extras.chamados.get(m.id) ?? null;
  return {
    id: m.id,
    numero: m.numero,
    nome: m.nome,
    codigo: m.codigo,
    processo: m.processo_nome,
    faseAtual: m.fase_atual,
    faseNome: fase?.nome ?? "",
    passoAtual: m.passo_atual,
    totalPassos: roteiro.passosPorFase.get(m.fase_atual)?.length ?? 0,
    estado: m.estado,
    estadoMostrado: estadoMostrado(m.estado, restante),
    pediuAjuda: chamadoId !== null,
    chamadoId,
    pessoas: extras.pessoas.get(m.id) ?? 0,
    final: m.final,
    versao: m.versao,
    relogio,
    faltaNaFase: avaliacao.ok ? null : (avaliacao.falta ?? null),
  };
}

export async function montarPainel(sql: Sql, eventoId: string): Promise<PainelApi | null> {
  const evento = await eventoPorId(sql, eventoId);
  if (!evento) return null;
  const [roteiro, mesas] = await Promise.all([roteiroDoEvento(sql, eventoId), mesasDoEvento(sql, eventoId)]);
  const extras = await extrasDasMesas(sql, mesas.map((m) => m.id));
  const agora = Date.now();
  return {
    agora: new Date(agora).toISOString(),
    evento: eventoParaApi(evento),
    fases: roteiro.fases.map((f) => ({
      ordem: f.ordem,
      nome: f.nome,
      nomeCurto: f.nome_curto,
      duracaoMin: f.duracao_min,
    })),
    mesas: mesas.map((m) => montarCartao(m, roteiro, extras, agora)),
  };
}

export async function montarCartaoDaMesa(sql: Sql, mesaId: string): Promise<CartaoMesaApi | null> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) return null;
  const [roteiro, extras] = await Promise.all([
    roteiroDoEvento(sql, mesa.evento_id),
    extrasDasMesas(sql, [mesa.id]),
  ]);
  return montarCartao(mesa, roteiro, extras, Date.now());
}
