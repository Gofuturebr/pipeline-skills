import { PAPEIS, type Papel, type TipoAtividade } from "./tipos";
import { MAXIMO_CONFERENCIAS, MINIMO_CONFERENCIAS } from "../conferencias";

// Critérios de conclusão de passo e de fase (RN03).
// Esta função roda no servidor antes de aceitar "Passo concluído" ou
// "Concluímos a fase", e na interface para habilitar o botão e dizer o que falta.

export interface PassoAvaliavel {
  id: string;
  ordem: number;
  tipo: TipoAtividade;
  criterio: string;
  config?: Record<string, unknown>;
}

export interface ContextoCriterio {
  /** Ids dos passos já concluídos pela mesa. */
  concluidos: ReadonlySet<string>;
  /** Papéis que já têm um nome (Fase 0). */
  papeisComNome?: ReadonlySet<Papel>;
  /** Ids dos passos de leitura marcados com "Lemos" (Fase 1). */
  lidos?: ReadonlySet<string>;
  /** Tarefa em uma linha confirmada pela mesa (Fase 1). */
  tarefa?: string;
  /** A mesa encerrou a entrevista (Fase 2). */
  entrevistaEncerrada?: boolean;
  /** Versão atual do SKILL.md, ou null se ainda não existe. */
  skillVersao?: number | null;
  /** Versão do SKILL.md que a mesa aprovou. */
  skillAprovadaVersao?: number | null;
  /** Modelos guardados em arquivos/ (sem contar o INDICE.md) e exemplos em exemplos/. */
  modelos?: number;
  exemplos?: number;
  /** Tipos de rodada que a mesa já fez com a própria pasta. */
  rodadas?: ReadonlySet<string>;
  /** Conferências da prova: válidas e recusadas. */
  conferenciasValidas?: number;
  conferenciasRecusadas?: number;
  /** Teste cruzado (Fase 5). */
  testeRodado?: boolean;
  falhasSemObservacao?: number;
  relatorioEnviado?: boolean;
  relatorioRecebido?: boolean;
  /** Conserto (Fase 6). */
  falhaEscolhida?: boolean;
  camadaEscolhida?: boolean;
  consertoAprovado?: boolean;
  rodadaDepoisDoConserto?: boolean;
  /** Entrega (Fase 7). */
  nomeConfirmado?: boolean;
  quandoRevisado?: boolean;
  final?: boolean;
}

export interface Avaliacao {
  ok: boolean;
  /** O que falta, escrito para a mesa. Presente quando ok é falso. */
  falta?: string;
  /** Verdadeiro quando a atividade do passo ainda não foi construída. */
  emConstrucao?: boolean;
}

/**
 * Tipos de atividade já construídos. Enquanto um tipo não está aqui, o passo
 * mostra "Atividade em construção" e o critério dele não bloqueia a mesa.
 * Cada marco acrescenta os seus tipos. Ver docs/decisoes.md.
 */
export const ATIVIDADES_PRONTAS: ReadonlySet<TipoAtividade> = new Set<TipoAtividade>([
  "papeis",
  "leitura",
  "frase",
  "entrevista",
  "editor",
  "rodada",
  "caixa",
  "conferencias",
  "placar",
  "relatorio",
  "conserto",
]);

/** Em qual marco cada tipo de atividade fica pronto. Só para a mensagem na tela. */
export const MARCO_DA_ATIVIDADE: Record<TipoAtividade, number> = {
  papeis: 2,
  leitura: 2,
  frase: 2,
  entrevista: 3,
  editor: 3,
  rodada: 4,
  caixa: 4,
  conferencias: 4,
  placar: 4,
  relatorio: 5,
  conserto: 5,
};

/**
 * Alguns tipos já prontos ainda têm variantes que chegam depois. Por exemplo,
 * a frase da Fase 1 (tarefa) chega no Marco 2, e a da Fase 7 (nome da skill),
 * no Marco 5. A chave é "tipo:valor" de config.campo ou config.conteudo.
 */
const MARCO_DA_VARIANTE: Record<string, number> = {};

function chaveDaVariante(passo: { tipo: TipoAtividade; config?: Record<string, unknown> }): string {
  const c = passo.config ?? {};
  const valor = c.campo ?? c.conteudo ?? c.secao ?? c.acao ?? c.modo ?? c.caso ?? "";
  return `${passo.tipo}:${String(valor)}`;
}

/** Se a atividade do passo já foi construída. Senão, a tela mostra "em construção". */
export function atividadePronta(passo: { tipo: TipoAtividade; config?: Record<string, unknown> }): boolean {
  return ATIVIDADES_PRONTAS.has(passo.tipo) && !(chaveDaVariante(passo) in MARCO_DA_VARIANTE);
}

/** Em que marco a atividade do passo fica pronta. Só para a mensagem na tela. */
export function marcoDaAtividade(passo: { tipo: TipoAtividade; config?: Record<string, unknown> }): number {
  return MARCO_DA_VARIANTE[chaveDaVariante(passo)] ?? MARCO_DA_ATIVIDADE[passo.tipo];
}

const OK: Avaliacao = { ok: true };

function papeisCompletos(ctx: ContextoCriterio): Avaliacao {
  const faltam = PAPEIS.filter((p) => !ctx.papeisComNome?.has(p)).length;
  if (faltam === 0) return OK;
  return { ok: false, falta: faltam === 1 ? "Falta dar nome a 1 papel" : `Faltam ${faltam} papéis sem nome` };
}

function tarefaConfirmada(ctx: ContextoCriterio): Avaliacao {
  return ctx.tarefa?.trim() ? OK : { ok: false, falta: "Falta confirmar a tarefa em uma linha" };
}

const FALTA_LER = 'Marquem "Lemos" depois de ler';

function conferenciasValidas(ctx: ContextoCriterio): Avaliacao {
  const validas = ctx.conferenciasValidas ?? 0;
  if ((ctx.conferenciasRecusadas ?? 0) > 0) return { ok: false, falta: "Corrijam ou tirem as conferências recusadas" };
  if (validas < MINIMO_CONFERENCIAS) {
    const faltam = MINIMO_CONFERENCIAS - validas;
    return { ok: false, falta: faltam === 1 ? "Falta 1 conferência válida" : `Faltam ${faltam} conferências válidas` };
  }
  if (validas > MAXIMO_CONFERENCIAS) return { ok: false, falta: `Deixem no máximo ${MAXIMO_CONFERENCIAS} conferências` };
  return OK;
}

const temRodada = (tipo: string, falta: string) => (ctx: ContextoCriterio): Avaliacao =>
  ctx.rodadas?.has(tipo) ? OK : { ok: false, falta };

function skillAprovada(ctx: ContextoCriterio): Avaliacao {
  if (ctx.skillVersao == null) return { ok: false, falta: "Peçam à IA para escrever o SKILL.md" };
  if (ctx.skillAprovadaVersao !== ctx.skillVersao) return { ok: false, falta: "Aprovem o SKILL.md" };
  return OK;
}

type CriterioPasso = (ctx: ContextoCriterio, passo: PassoAvaliavel) => Avaliacao;
type CriterioFase = (ctx: ContextoCriterio, passos: PassoAvaliavel[]) => Avaliacao;

const CRITERIOS_PASSO: Record<string, CriterioPasso> = {
  livre: () => OK,
  papeis_completos: (ctx) => papeisCompletos(ctx),
  lido: (ctx, passo) => (ctx.lidos?.has(passo.id) ? OK : { ok: false, falta: FALTA_LER }),
  tarefa_confirmada: (ctx) => tarefaConfirmada(ctx),
  entrevista_completa: (ctx) =>
    ctx.entrevistaEncerrada ? OK : { ok: false, falta: "Encerrem a entrevista quando o botão aparecer" },
  skill_gerada: (ctx) => (ctx.skillVersao != null ? OK : { ok: false, falta: "Peçam à IA para escrever o SKILL.md" }),
  skill_aprovada: (ctx) => skillAprovada(ctx),
  rodada_feita: temRodada("exemplo", "Rodem a tarefa com o caso de exemplo"),
  segunda_rodada_feita: temRodada("segunda", "Rodem a tarefa de novo"),
  modelo_salvo: (ctx) => ((ctx.modelos ?? 0) > 0 ? OK : { ok: false, falta: "Guardem pelo menos um modelo na pasta" }),
  exemplo_salvo: (ctx) => ((ctx.exemplos ?? 0) > 0 ? OK : { ok: false, falta: "Salvem pelo menos um exemplo" }),
  conferencias_validas: (ctx) => conferenciasValidas(ctx),
  placar_executado: temRodada("prova", "Rodem a tarefa para ver o placar"),
  teste_rodado: (ctx) => (ctx.testeRodado ? OK : { ok: false, falta: "Rodem a skill da mesa parceira" }),
  falhas_observadas: (ctx) =>
    !ctx.testeRodado
      ? { ok: false, falta: "Rodem a skill da mesa parceira" }
      : (ctx.falhasSemObservacao ?? 0) > 0
        ? { ok: false, falta: "Escrevam o que aconteceu em cada falha" }
        : OK,
  relatorio_enviado: (ctx) => (ctx.relatorioEnviado ? OK : { ok: false, falta: "Enviem o relatório" }),
  relatorio_recebido: (ctx) =>
    ctx.relatorioRecebido ? OK : { ok: false, falta: "Esperem o relatório da mesa parceira" },
  falha_escolhida: (ctx) => (ctx.falhaEscolhida ? OK : { ok: false, falta: "Escolham a falha mais importante" }),
  camada_escolhida: (ctx) => (ctx.camadaEscolhida ? OK : { ok: false, falta: "Marquem a camada que falhou" }),
  conserto_aprovado: (ctx) => (ctx.consertoAprovado ? OK : { ok: false, falta: "Aprovem o conserto" }),
  rodada_conserto_feita: (ctx) =>
    ctx.rodadaDepoisDoConserto ? OK : { ok: false, falta: "Rodem a tarefa de novo depois do conserto" },
  nome_definido: (ctx) => (ctx.nomeConfirmado ? OK : { ok: false, falta: "Confirmem o nome da skill" }),
  secao_revisada: (ctx) => (ctx.quandoRevisado ? OK : { ok: false, falta: "Marquem que revisaram a seção Quando usar" }),
  skill_final: (ctx) => (ctx.final ? OK : { ok: false, falta: "Marquem a skill como final" }),
};

const CRITERIOS_FASE: Record<string, CriterioFase> = {
  papeis_completos: (ctx) => papeisCompletos(ctx),
  ficha_lida_e_tarefa: (ctx, passos) => {
    const naoLidos = passos.filter((p) => p.criterio === "lido" && !ctx.lidos?.has(p.id));
    if (naoLidos.length > 0) return { ok: false, falta: FALTA_LER };
    return tarefaConfirmada(ctx);
  },
  modelo_e_exemplo: (ctx) =>
    (ctx.modelos ?? 0) === 0
      ? { ok: false, falta: "Falta guardar pelo menos um modelo" }
      : (ctx.exemplos ?? 0) === 0
        ? { ok: false, falta: "Falta salvar pelo menos um exemplo" }
        : OK,
  conferencias_validas: (ctx) => conferenciasValidas(ctx),
  teste_cruzado_completo: (ctx) =>
    !ctx.relatorioEnviado
      ? { ok: false, falta: "Falta enviar o relatório à mesa parceira" }
      : !ctx.relatorioRecebido
        ? { ok: false, falta: "Falta receber o relatório da mesa parceira" }
        : OK,
  conserto_e_nova_rodada: (ctx) =>
    !ctx.consertoAprovado
      ? { ok: false, falta: "Falta aprovar um conserto" }
      : !ctx.rodadaDepoisDoConserto
        ? { ok: false, falta: "Falta rodar de novo depois do conserto" }
        : OK,
  skill_final: (ctx) => (ctx.final ? OK : { ok: false, falta: "Falta marcar a skill como final" }),
  entrevista_e_skill_aprovada: (ctx) =>
    ctx.entrevistaEncerrada ? skillAprovada(ctx) : { ok: false, falta: "Falta encerrar a entrevista" },
};

export function avaliarPasso(passo: PassoAvaliavel, ctx: ContextoCriterio): Avaliacao {
  if (!atividadePronta(passo)) return { ok: true, emConstrucao: true };
  const fn = CRITERIOS_PASSO[passo.criterio];
  if (!fn) return { ok: false, falta: "Este passo está sem critério configurado. Chamem o gestor." };
  return fn(ctx, passo);
}

export function avaliarFase(
  fase: { criterio: string },
  passos: PassoAvaliavel[],
  ctx: ContextoCriterio,
): Avaliacao {
  const faltando = passos.filter((p) => !ctx.concluidos.has(p.id)).length;
  if (faltando > 0) {
    return {
      ok: false,
      falta: faltando === 1 ? "Falta concluir 1 passo" : `Faltam ${faltando} passos`,
    };
  }
  // O critério próprio da fase depende das atividades. Enquanto alguma
  // atividade da fase estiver em construção, vale só a conclusão dos passos.
  if (passos.some((p) => !atividadePronta(p))) return { ok: true, emConstrucao: true };
  const fn = CRITERIOS_FASE[fase.criterio];
  if (!fn) return { ok: false, falta: "Esta fase está sem critério configurado. Chamem o gestor." };
  return fn(ctx, passos);
}
