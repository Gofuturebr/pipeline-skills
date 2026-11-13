// Máquina de estados da mesa. Funções puras: recebem o estado atual e uma ação
// e devolvem o novo estado ou o motivo da recusa. O servidor aplica o resultado
// dentro de uma transação, com a linha da mesa travada.

export type EstadoBase = "em_andamento" | "pronta" | "pausada";
export type EstadoMostrado = "em_andamento" | "pronta" | "atrasada" | "pausada";
export type ModoLiberacao = "manual" | "automatico";

export const PRIMEIRA_FASE = 0;
export const ULTIMA_FASE = 7;

export interface EstadoFaseMesa {
  fase: number;
  estado: EstadoBase;
  estadoAntesPausa: Exclude<EstadoBase, "pausada"> | null;
  final: boolean;
}

export type AcaoMesa =
  | { tipo: "concluir_fase"; criteriosOk: boolean; modo: ModoLiberacao }
  | { tipo: "avancar" }
  | { tipo: "forcar" }
  | { tipo: "voltar" }
  | { tipo: "desfazer_avanco" }
  | { tipo: "pausar" }
  | { tipo: "retomar" };

export interface EfeitosTransicao {
  /** A fase mudou: zera o cronômetro da fase e escolhe o passo de entrada. */
  mudouFase: boolean;
  /** A fase foi reaberta pelo gestor: a mesa mostra a faixa de fase reaberta. */
  reaberta: boolean;
  /** No modo automático, a mesa pronta avançou sem esperar o gestor (RN02). */
  avancoAutomatico: boolean;
}

export type ResultadoTransicao =
  | { ok: true; novo: EstadoFaseMesa; efeitos: EfeitosTransicao }
  | { ok: false; motivo: string };

const SEM_EFEITOS: EfeitosTransicao = { mudouFase: false, reaberta: false, avancoAutomatico: false };

function recusa(motivo: string): ResultadoTransicao {
  return { ok: false, motivo };
}

function proximaFase(m: EstadoFaseMesa, efeitos: Partial<EfeitosTransicao> = {}): ResultadoTransicao {
  if (m.fase >= ULTIMA_FASE) return recusa("A mesa já está na última fase.");
  return {
    ok: true,
    novo: { ...m, fase: m.fase + 1, estado: "em_andamento", estadoAntesPausa: null },
    efeitos: { ...SEM_EFEITOS, mudouFase: true, ...efeitos },
  };
}

export function transicao(m: EstadoFaseMesa, acao: AcaoMesa): ResultadoTransicao {
  switch (acao.tipo) {
    case "concluir_fase": {
      // RN01 e RN03: a mesa só declara que concluiu. Quem libera é o gestor,
      // a não ser no modo automático (RN02).
      if (m.estado === "pausada") return recusa("A mesa está pausada.");
      if (m.estado === "pronta") return recusa("A mesa já concluiu esta fase.");
      if (!acao.criteriosOk) return recusa("Os critérios da fase ainda não foram atendidos.");
      const pronta: EstadoFaseMesa = { ...m, estado: "pronta", estadoAntesPausa: null };
      if (acao.modo === "automatico" && m.fase < ULTIMA_FASE) {
        return proximaFase(pronta, { avancoAutomatico: true });
      }
      return { ok: true, novo: pronta, efeitos: SEM_EFEITOS };
    }
    case "avancar":
      if (m.estado === "pausada") return recusa("Retome a mesa antes de avançar.");
      if (m.estado !== "pronta") return recusa("A mesa ainda não concluiu a fase. Use forçar avanço.");
      return proximaFase(m);
    case "forcar":
      if (m.estado === "pausada") return recusa("Retome a mesa antes de avançar.");
      return proximaFase(m);
    case "voltar":
      // RN05: voltar nunca apaga conteúdo. Aqui só muda a fase.
      if (m.estado === "pausada") return recusa("Retome a mesa antes de voltar a fase.");
      if (m.fase <= PRIMEIRA_FASE) return recusa("A mesa já está na primeira fase.");
      return {
        ok: true,
        novo: { ...m, fase: m.fase - 1, estado: "em_andamento", estadoAntesPausa: null },
        efeitos: { ...SEM_EFEITOS, mudouFase: true, reaberta: true },
      };
    case "desfazer_avanco":
      // Desfaz um avanço recente: a mesa volta à fase anterior já pronta.
      if (m.estado === "pausada") return recusa("Retome a mesa antes de desfazer.");
      if (m.fase <= PRIMEIRA_FASE) return recusa("Não há avanço para desfazer.");
      return {
        ok: true,
        novo: { ...m, fase: m.fase - 1, estado: "pronta", estadoAntesPausa: null },
        efeitos: { ...SEM_EFEITOS, mudouFase: true },
      };
    case "pausar":
      if (m.estado === "pausada") return recusa("A mesa já está pausada.");
      return {
        ok: true,
        novo: { ...m, estado: "pausada", estadoAntesPausa: m.estado },
        efeitos: SEM_EFEITOS,
      };
    case "retomar":
      if (m.estado !== "pausada") return recusa("A mesa não está pausada.");
      return {
        ok: true,
        novo: { ...m, estado: m.estadoAntesPausa ?? "em_andamento", estadoAntesPausa: null },
        efeitos: SEM_EFEITOS,
      };
  }
}

/**
 * Passo em que a mesa entra ao chegar numa fase: o primeiro ainda não concluído,
 * ou o último, se todos já foram concluídos (caso de fase reaberta).
 */
export function passoDeEntrada(ordens: number[], concluidas: ReadonlySet<number>): number {
  const ordenadas = [...ordens].sort((a, b) => a - b);
  if (ordenadas.length === 0) return 1;
  return ordenadas.find((o) => !concluidas.has(o)) ?? ordenadas[ordenadas.length - 1];
}
