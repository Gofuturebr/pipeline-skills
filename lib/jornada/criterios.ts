import { PAPEIS, type Papel, type TipoAtividade } from "./tipos";

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
const MARCO_DA_VARIANTE: Record<string, number> = {
  "frase:nome_skill": 5,
  "leitura:entrega": 5,
  "editor:Quando usar": 5,
  "editor:final": 5,
};

function chaveDaVariante(passo: { tipo: TipoAtividade; config?: Record<string, unknown> }): string {
  const c = passo.config ?? {};
  const valor = c.campo ?? c.conteudo ?? c.secao ?? c.acao ?? "";
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
};

const CRITERIOS_FASE: Record<string, CriterioFase> = {
  papeis_completos: (ctx) => papeisCompletos(ctx),
  ficha_lida_e_tarefa: (ctx, passos) => {
    const naoLidos = passos.filter((p) => p.criterio === "lido" && !ctx.lidos?.has(p.id));
    if (naoLidos.length > 0) return { ok: false, falta: FALTA_LER };
    return tarefaConfirmada(ctx);
  },
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
