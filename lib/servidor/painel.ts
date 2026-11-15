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
import { contextosDasMesas } from "./contexto";
import { JANELA_CONECTADO_S } from "./participantes";
import type { ContextoCriterio } from "@/lib/jornada";
import { estadoMostrado, segundosRestantesFase } from "@/lib/tempo";
import type { CartaoMesaApi, PainelApi } from "@/lib/tipos-api";

export { JANELA_CONECTADO_S };

interface Extras {
  chamados: Map<string, string>;
  pessoas: Map<string, number>;
  contextos: Map<string, ContextoCriterio>;
  testa: Map<string, { id: string; nome: string }>;
  comSkill: Set<string>;
}

async function extrasDasMesas(sql: Sql, mesas: LinhaMesa[]): Promise<Extras> {
  const ids = mesas.map((m) => m.id);
  if (ids.length === 0) {
    return { chamados: new Map(), pessoas: new Map(), contextos: new Map(), testa: new Map(), comSkill: new Set() };
  }
  const [chamados, pessoas, contextos, testa, comSkill] = await Promise.all([
    sql<{ mesa_id: string; id: string }[]>`
      select mesa_id, id from chamado where estado = 'aberto' and mesa_id in ${sql(ids)}`,
    sql<{ mesa_id: string; n: number }[]>`
      select mesa_id, count(*)::int as n from participante
      where mesa_id in ${sql(ids)} and ultimo_sinal_em > now() - make_interval(secs => ${JANELA_CONECTADO_S})
      group by mesa_id`,
    contextosDasMesas(sql, mesas),
    sql<{ testadora: string; id: string; nome: string }[]>`
      select t.mesa_testadora_id as testadora, m.id, m.nome
      from teste_cruzado t join mesa m on m.id = t.mesa_autora_id
      where t.mesa_testadora_id in ${sql(ids)}`,
    sql<{ mesa_id: string }[]>`select mesa_id from arquivo where caminho = 'SKILL.md' and mesa_id in ${sql(ids)}`,
  ]);
  return {
    chamados: new Map(chamados.map((c) => [c.mesa_id, c.id])),
    pessoas: new Map(pessoas.map((p) => [p.mesa_id, p.n])),
    contextos,
    testa: new Map(testa.map((t) => [t.testadora, { id: t.id, nome: t.nome }])),
    comSkill: new Set(comSkill.map((c) => c.mesa_id)),
  };
}

function montarCartao(m: LinhaMesa, roteiro: Roteiro, extras: Extras, agora: number): CartaoMesaApi {
  const fase = roteiro.fases.find((f) => f.ordem === m.fase_atual);
  const relogio = relogioDaMesa(m, fase?.duracao_min ?? 0);
  const restante = segundosRestantesFase(relogio, relogio.duracaoMin, agora);
  const avaliacao = avaliacaoDaFase(roteiro, m.fase_atual, extras.contextos.get(m.id) ?? { concluidos: new Set() });
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
    testa: extras.testa.get(m.id) ?? null,
    temSkill: extras.comSkill.has(m.id),
    faltaNaFase: avaliacao.ok ? null : (avaliacao.falta ?? null),
  };
}

export async function montarPainel(sql: Sql, eventoId: string): Promise<PainelApi | null> {
  const evento = await eventoPorId(sql, eventoId);
  if (!evento) return null;
  const [roteiro, mesas] = await Promise.all([roteiroDoEvento(sql, eventoId), mesasDoEvento(sql, eventoId)]);
  const extras = await extrasDasMesas(sql, mesas);
  const agora = Date.now();
  const [{ n: pares }] = await sql<{ n: number }[]>`
    select count(*)::int as n from teste_cruzado where evento_id = ${eventoId}`;
  return {
    agora: new Date(agora).toISOString(),
    evento: eventoParaApi(evento),
    paresFormados: pares > 0,
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
    extrasDasMesas(sql, [mesa]),
  ]);
  return montarCartao(mesa, roteiro, extras, Date.now());
}
