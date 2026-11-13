import type { Sql } from "./db";
import {
  eventoParaApi,
  eventoPorId,
  iso,
  passosConcluidos,
  relogioDaMesa,
  roteiroDoEvento,
  type LinhaMesa,
  type LinhaPasso,
  type Roteiro,
} from "./consultas";
import { avaliarFase, avaliarPasso, nomeDoPapel, type ContextoCriterio } from "@/lib/jornada";
import { estadoMostrado, segundosRestantesFase } from "@/lib/tempo";
import type { AvisoApi, EstadoMesaApi, FaseApi, PassoApi, SituacaoFase } from "@/lib/tipos-api";

/** Avisos aparecem por 60 segundos (seção 8 do frontend). */
export const VIDA_AVISO_S = 60;

function passoParaApi(p: LinhaPasso, ctx: ContextoCriterio): PassoApi {
  return {
    id: p.id,
    ordem: p.ordem,
    chave: p.chave,
    instrucao: p.instrucao,
    papel: p.papel,
    papelNome: nomeDoPapel(p.papel),
    tipo: p.tipo_atividade,
    config: p.config ?? {},
    permiteEditar: p.permite_editar,
    concluido: ctx.concluidos.has(p.id),
    avaliacao: avaliarPasso({ id: p.id, ordem: p.ordem, tipo: p.tipo_atividade, criterio: p.criterio }, ctx),
  };
}

export function avaliacaoDaFase(roteiro: Roteiro, ordem: number, ctx: ContextoCriterio) {
  const fase = roteiro.fases.find((f) => f.ordem === ordem);
  const passos = roteiro.passosPorFase.get(ordem) ?? [];
  return avaliarFase(
    { criterio: fase?.criterio ?? "" },
    passos.map((p) => ({ id: p.id, ordem: p.ordem, tipo: p.tipo_atividade, criterio: p.criterio })),
    ctx,
  );
}

/**
 * Estado da mesa como a tela da mesa vê. Fases ainda não liberadas vêm sem
 * passos e sem textos: a mesa não consegue abrir fase não liberada.
 */
export async function montarEstadoMesa(sql: Sql, mesa: LinhaMesa): Promise<EstadoMesaApi> {
  const [evento, roteiro, concluidos, avisos, chamados] = await Promise.all([
    eventoPorId(sql, mesa.evento_id),
    roteiroDoEvento(sql, mesa.evento_id),
    passosConcluidos(sql, mesa.id),
    sql<{ id: string; texto: string; criado_em: Date; mesa_id: string | null }[]>`
      select id, texto, criado_em, mesa_id from aviso
      where evento_id = ${mesa.evento_id} and (mesa_id is null or mesa_id = ${mesa.id})
        and criado_em > now() - make_interval(secs => ${VIDA_AVISO_S})
      order by criado_em desc limit 3`,
    sql<{ n: number }[]>`
      select count(*)::int as n from chamado where mesa_id = ${mesa.id} and estado = 'aberto'`,
  ]);
  if (!evento) throw new Error("Evento da mesa não encontrado");

  const ctx: ContextoCriterio = { concluidos };
  const agora = Date.now();

  const fases: FaseApi[] = roteiro.fases.map((f) => {
    const situacao: SituacaoFase =
      f.ordem < mesa.fase_atual ? "concluida" : f.ordem === mesa.fase_atual ? "atual" : "bloqueada";
    const liberada = situacao !== "bloqueada";
    return {
      ordem: f.ordem,
      nome: f.nome,
      nomeCurto: f.nome_curto,
      duracaoMin: f.duracao_min,
      entrega: f.entrega,
      criterioTexto: f.criterio_texto,
      situacao,
      aprofundamento: liberada ? f.aprofundamento : null,
      passos: liberada ? (roteiro.passosPorFase.get(f.ordem) ?? []).map((p) => passoParaApi(p, ctx)) : [],
    };
  });

  const faseAtual = roteiro.fases.find((f) => f.ordem === mesa.fase_atual);
  const relogio = relogioDaMesa(mesa, faseAtual?.duracao_min ?? 0);
  const restante = segundosRestantesFase(relogio, relogio.duracaoMin, agora);

  const listaAvisos: AvisoApi[] = avisos.map((a) => ({
    id: a.id,
    texto: a.texto,
    criadoEm: iso(a.criado_em) as string,
    paraTodas: a.mesa_id === null,
  }));

  return {
    agora: new Date(agora).toISOString(),
    evento: eventoParaApi(evento),
    mesa: {
      id: mesa.id,
      numero: mesa.numero,
      nome: mesa.nome,
      codigo: mesa.codigo,
      processo: mesa.processo_nome,
      tarefa: mesa.tarefa,
      faseAtual: mesa.fase_atual,
      passoAtual: mesa.passo_atual,
      estado: mesa.estado,
      estadoMostrado: estadoMostrado(mesa.estado, restante),
      reabertaEm: iso(mesa.reaberta_em),
      final: mesa.final,
      versao: mesa.versao,
      relogio,
    },
    fases,
    avaliacaoFase: avaliacaoDaFase(roteiro, mesa.fase_atual, ctx),
    avisos: listaAvisos,
    chamadoAberto: chamados[0].n > 0,
  };
}
