// Tipos da jornada. Os dados ficam em ./fases.ts e são copiados para o banco
// no seed, onde o admin pode editar textos e durações por evento.

export const PAPEIS = ["dono", "piloto", "guardiao", "cetico", "testador", "porta_voz"] as const;
export type Papel = (typeof PAPEIS)[number];

/** Papel responsável por um passo. "mesa" quer dizer o grupo inteiro. */
export type PapelDoPasso = Papel | "mesa";

export const TIPOS_ATIVIDADE = [
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
] as const;
export type TipoAtividade = (typeof TIPOS_ATIVIDADE)[number];

export interface DefinicaoPasso {
  /** Identificador estável, usado pelo código para achar o passo. */
  chave: string;
  /** Texto mostrado em corpo de título na Folha de trabalho. Editável no admin. */
  instrucao: string;
  papel: PapelDoPasso;
  tipo: TipoAtividade;
  /** Chave do critério de conclusão do passo, avaliado em ./criterios.ts. */
  criterio: string;
  /** Parâmetros próprios do tipo de atividade. */
  config?: Record<string, unknown>;
  /** Se o passo permite editar arquivos da pasta. */
  permiteEditar?: boolean;
}

export interface DefinicaoFase {
  ordem: number;
  chave: string;
  nome: string;
  nomeCurto: string;
  /** Duração padrão em minutos (seção 3 da especificação). */
  duracaoMin: number;
  entrega: string;
  /** Chave do critério de conclusão da fase, avaliado em ./criterios.ts. */
  criterio: string;
  /** Texto do critério, para mostrar à mesa e ao gestor. */
  criterioTexto: string;
  /** Atividade sugerida na tela de espera, quando a mesa conclui antes do tempo. */
  aprofundamento: string;
  /**
   * Texto do campo de contribuição no celular. Sem ele, a fase não recebe
   * contribuições (seção 6 do frontend: só as Fases 1 e 2).
   */
  rotuloContribuicao?: string;
  passos: DefinicaoPasso[];
}
