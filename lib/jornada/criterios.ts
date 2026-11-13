import type { TipoAtividade } from "./tipos";

// Critérios de conclusão de passo e de fase (RN03).
// Esta função roda no servidor antes de aceitar "Passo concluído" ou
// "Concluímos a fase", e na interface para habilitar o botão e dizer o que falta.

export interface PassoAvaliavel {
  id: string;
  ordem: number;
  tipo: TipoAtividade;
  criterio: string;
}

export interface ContextoCriterio {
  /** Ids dos passos já concluídos pela mesa. */
  concluidos: ReadonlySet<string>;
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
export const ATIVIDADES_PRONTAS: ReadonlySet<TipoAtividade> = new Set<TipoAtividade>([]);

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

const OK: Avaliacao = { ok: true };

type FuncaoCriterio = (ctx: ContextoCriterio) => Avaliacao;

const CRITERIOS_PASSO: Record<string, FuncaoCriterio> = {
  livre: () => OK,
};

const CRITERIOS_FASE: Record<string, FuncaoCriterio> = {};

export function avaliarPasso(passo: PassoAvaliavel, ctx: ContextoCriterio): Avaliacao {
  if (!ATIVIDADES_PRONTAS.has(passo.tipo)) return { ok: true, emConstrucao: true };
  const fn = CRITERIOS_PASSO[passo.criterio];
  if (!fn) return { ok: false, falta: "Este passo está sem critério configurado. Chamem o gestor." };
  return fn(ctx);
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
  if (passos.some((p) => !ATIVIDADES_PRONTAS.has(p.tipo))) return { ok: true, emConstrucao: true };
  const fn = CRITERIOS_FASE[fase.criterio];
  if (!fn) return { ok: false, falta: "Esta fase está sem critério configurado. Chamem o gestor." };
  return fn(ctx);
}
