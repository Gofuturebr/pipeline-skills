import type { Sql } from "./db";
import {
  eventoParaApi,
  eventoPorId,
  iso,
  relogioDaMesa,
  roteiroDoEvento,
  type LinhaMesa,
  type LinhaPasso,
  type Roteiro,
} from "./consultas";
import { contextoDaMesa } from "./contexto";
import { JANELA_CONECTADO_S } from "./participantes";
import {
  avaliarFase,
  avaliarPasso,
  DEFINICAO_PAPEIS,
  nomeDoPapel,
  type ContextoCriterio,
} from "@/lib/jornada";
import { lerFicha } from "@/lib/processo";
import { estadoMostrado, segundosRestantesFase } from "@/lib/tempo";
import type {
  AvisoApi,
  ContribuicaoApi,
  EstadoMesaApi,
  FaseApi,
  PapelApi,
  PassoApi,
  ProcessoApi,
  SituacaoFase,
} from "@/lib/tipos-api";

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
    lido: ctx.lidos?.has(p.id) ?? false,
    avaliacao: avaliarPasso({ id: p.id, ordem: p.ordem, tipo: p.tipo_atividade, criterio: p.criterio, config: p.config }, ctx),
  };
}

export function avaliacaoDaFase(roteiro: Roteiro, ordem: number, ctx: ContextoCriterio) {
  const fase = roteiro.fases.find((f) => f.ordem === ordem);
  const passos = roteiro.passosPorFase.get(ordem) ?? [];
  return avaliarFase(
    { criterio: fase?.criterio ?? "" },
    passos.map((p) => ({ id: p.id, ordem: p.ordem, tipo: p.tipo_atividade, criterio: p.criterio, config: p.config })),
    ctx,
  );
}

interface LinhaProcesso {
  nome: string;
  ficha: unknown;
  kit_materiais: string;
  exemplo_bom: string;
  exemplo_ruim: string;
}

interface LinhaContribuicao {
  id: string;
  texto: string;
  estado: "pendente" | "aceita" | "descartada";
  fase: number;
  criado_em: Date;
  autor: string | null;
}

function contribuicaoParaApi(c: LinhaContribuicao): ContribuicaoApi {
  return { id: c.id, texto: c.texto, autor: c.autor ?? "", fase: c.fase, criadoEm: iso(c.criado_em) as string };
}

/**
 * Estado da mesa como a tela da mesa vê. Fases ainda não liberadas vêm sem
 * passos e sem textos: a mesa não consegue abrir fase não liberada.
 */
export async function montarEstadoMesa(sql: Sql, mesa: LinhaMesa): Promise<EstadoMesaApi> {
  const [evento, roteiro, ctx, avisos, chamados, participantes, papeis, processos, contribuicoes] =
    await Promise.all([
      eventoPorId(sql, mesa.evento_id),
      roteiroDoEvento(sql, mesa.evento_id),
      contextoDaMesa(sql, mesa),
      sql<{ id: string; texto: string; criado_em: Date; mesa_id: string | null }[]>`
        select id, texto, criado_em, mesa_id from aviso
        where evento_id = ${mesa.evento_id} and (mesa_id is null or mesa_id = ${mesa.id})
          and criado_em > now() - make_interval(secs => ${VIDA_AVISO_S})
        order by criado_em desc limit 3`,
      sql<{ n: number }[]>`
        select count(*)::int as n from chamado where mesa_id = ${mesa.id} and estado = 'aberto'`,
      sql<{ id: string; primeiro_nome: string; conectado: boolean }[]>`
        select id, primeiro_nome,
               ultimo_sinal_em > now() - make_interval(secs => ${JANELA_CONECTADO_S}) as conectado
        from participante where mesa_id = ${mesa.id} order by criado_em`,
      sql<{ papel: string; nome: string; participante_id: string | null }[]>`
        select papel, nome, participante_id from papel_mesa where mesa_id = ${mesa.id}`,
      // A ficha e o kit só chegam à mesa a partir da Fase 1. O caso de exemplo e o
      // caso novo ficam de fora: são usados nas Fases 3 e 5.
      mesa.processo_id && mesa.fase_atual >= 1
        ? sql<LinhaProcesso[]>`
            select nome, ficha, kit_materiais, exemplo_bom, exemplo_ruim
            from processo where id = ${mesa.processo_id}`
        : Promise.resolve([] as LinhaProcesso[]),
      sql<LinhaContribuicao[]>`
        select c.id, c.texto, c.estado, c.fase, c.criado_em, p.primeiro_nome as autor
        from contribuicao c left join participante p on p.id = c.participante_id
        where c.mesa_id = ${mesa.id} and c.fase <= ${mesa.fase_atual}
        order by c.criado_em`,
    ]);
  if (!evento) throw new Error("Evento da mesa não encontrado");

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
      recebeContribuicoes: liberada && f.rotulo_contribuicao !== "",
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

  const listaPapeis: PapelApi[] = DEFINICAO_PAPEIS.map((d) => {
    const linha = papeis.find((p) => p.papel === d.papel);
    return {
      papel: d.papel,
      nome: d.nome,
      descricao: d.descricao,
      pessoa: linha?.nome ?? null,
      participanteId: linha?.participante_id ?? null,
    };
  });

  const p = processos[0];
  const processo: ProcessoApi | null = p
    ? {
        nome: p.nome,
        ficha: lerFicha(p.ficha),
        kitMateriais: p.kit_materiais,
        exemploBom: p.exemplo_bom,
        exemploRuim: p.exemplo_ruim,
      }
    : null;

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
    participantes: participantes.map((x) => ({ id: x.id, nome: x.primeiro_nome, conectado: x.conectado })),
    papeis: listaPapeis,
    processoDetalhe: processo,
    contribuicoes: {
      // Pendentes de fases anteriores continuam na fila: nada se perde ao mudar de fase.
      pendentes: contribuicoes.filter((c) => c.estado === "pendente").map(contribuicaoParaApi),
      aceitas: contribuicoes.filter((c) => c.estado === "aceita").map(contribuicaoParaApi),
      descartadas: contribuicoes.filter((c) => c.estado === "descartada" && c.fase === mesa.fase_atual).length,
    },
  };
}
