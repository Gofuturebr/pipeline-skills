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
}

async function extrasDasMesas(sql: Sql, mesas: LinhaMesa[]): Promise<Extras> {
  const ids = mesas.map((m) => m.id);
  if (ids.length === 0) return { chamados: new Map(), pessoas: new Map(), contextos: new Map() };
  const [chamados, pessoas, contextos] = await Promise.all([
    sql<{ mesa_id: string; id: string }[]>`
      select mesa_id, id from chamado where estado = 'aberto' and mesa_id in ${sql(ids)}`,
    sql<{ mesa_id: string; n: number }[]>`
      select mesa_id, count(*)::int as n from participante
      where mesa_id in ${sql(ids)} and ultimo_sinal_em > now() - make_interval(secs => ${JANELA_CONECTADO_S})
      group by mesa_id`,
    contextosDasMesas(sql, mesas),
  ]);
  return {
    chamados: new Map(chamados.map((c) => [c.mesa_id, c.id])),
    pessoas: new Map(pessoas.map((p) => [p.mesa_id, p.n])),
    contextos,
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
    faltaNaFase: avaliacao.ok ? null : (avaliacao.falta ?? null),
  };
}

export async function montarPainel(sql: Sql, eventoId: string): Promise<PainelApi | null> {
  const evento = await eventoPorId(sql, eventoId);
  if (!evento) return null;
  const [roteiro, mesas] = await Promise.all([roteiroDoEvento(sql, eventoId), mesasDoEvento(sql, eventoId)]);
  const extras = await extrasDasMesas(sql, mesas);
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
    extrasDasMesas(sql, [mesa]),
  ]);
  return montarCartao(mesa, roteiro, extras, Date.now());
}
