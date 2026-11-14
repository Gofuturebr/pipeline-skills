// Formato das respostas das rotas de API, usado pelo servidor e pelas telas.
import type { Avaliacao, Papel, PapelDoPasso, TipoAtividade } from "@/lib/jornada";
import type { Ficha } from "@/lib/processo";
import type { EstadoBase, EstadoMostrado, ModoLiberacao } from "@/lib/maquina";

export interface RelogioApi {
  faseIniciadaEm: string;
  pausadaDesde: string | null;
  pausaAcumuladaS: number;
  ajusteTempoS: number;
  duracaoMin: number;
}

export interface EventoApi {
  id: string;
  nome: string;
  data: string;
  modoLiberacao: ModoLiberacao;
  faseReferencia: number;
  iniciadoEm: string | null;
  pausaGeralAte: string | null;
  duracaoIntervaloMin: number;
}

export interface PassoApi {
  id: string;
  ordem: number;
  chave: string;
  instrucao: string;
  papel: PapelDoPasso;
  papelNome: string;
  tipo: TipoAtividade;
  config: Record<string, unknown>;
  permiteEditar: boolean;
  concluido: boolean;
  /** A mesa marcou "Lemos" (passos de leitura). */
  lido: boolean;
  avaliacao: Avaliacao;
}

export type SituacaoFase = "concluida" | "atual" | "bloqueada";

export interface FaseApi {
  ordem: number;
  nome: string;
  nomeCurto: string;
  duracaoMin: number;
  entrega: string;
  criterioTexto: string;
  situacao: SituacaoFase;
  /** Só vem preenchido para fases liberadas (concluídas ou atual). */
  aprofundamento: string | null;
  /** A fase recebe contribuições pelo celular (Fases 1 e 2). */
  recebeContribuicoes: boolean;
  /** Vazio para fases bloqueadas: a mesa não recebe o conteúdo de fase não liberada. */
  passos: PassoApi[];
}

export interface AvisoApi {
  id: string;
  texto: string;
  criadoEm: string;
  paraTodas: boolean;
}

export interface EstadoMesaApi {
  agora: string;
  evento: EventoApi;
  mesa: {
    id: string;
    numero: number;
    nome: string;
    codigo: string;
    processo: string | null;
    tarefa: string;
    faseAtual: number;
    passoAtual: number;
    estado: EstadoBase;
    estadoMostrado: EstadoMostrado;
    reabertaEm: string | null;
    final: boolean;
    versao: number;
    relogio: RelogioApi;
  };
  fases: FaseApi[];
  avaliacaoFase: Avaliacao;
  avisos: AvisoApi[];
  chamadoAberto: boolean;
  /** Quem entrou pelo celular, na ordem de chegada. */
  participantes: ParticipanteApi[];
  /** Os 6 papéis, na ordem da especificação, com a pessoa escolhida. */
  papeis: PapelApi[];
  /** Ficha e kit do processo. Só a partir da Fase 1. */
  processoDetalhe: ProcessoApi | null;
  contribuicoes: {
    pendentes: ContribuicaoApi[];
    aceitas: ContribuicaoApi[];
    /** Descartadas na fase atual. */
    descartadas: number;
  };
}

export interface ParticipanteApi {
  id: string;
  nome: string;
  conectado: boolean;
}

export interface PapelApi {
  papel: Papel;
  nome: string;
  descricao: string;
  /** Nome de quem ficou com o papel. */
  pessoa: string | null;
  participanteId: string | null;
}

export interface ProcessoApi {
  nome: string;
  ficha: Ficha;
  kitMateriais: string;
  exemploBom: string;
  exemploRuim: string;
}

export interface ContribuicaoApi {
  id: string;
  texto: string;
  /** Primeiro nome de quem enviou. */
  autor: string;
  fase: number;
  criadoEm: string;
}

/** O que o celular do participante recebe. */
export interface EstadoCelularApi {
  agora: string;
  evento: { id: string; pausaGeralAte: string | null };
  mesa: {
    id: string;
    nome: string;
    faseAtual: number;
    faseNome: string;
    passoAtual: number;
    totalPassos: number;
    estado: EstadoBase;
    relogio: RelogioApi;
    /** Instrução e papel do passo atual. */
    passo: { instrucao: string; papelNome: string } | null;
  };
  /** Nulo quando o celular ainda não entrou com o nome. */
  participante: {
    nome: string;
    papeis: { papel: Papel; nome: string; descricao: string }[];
  } | null;
  /** Campo de contribuição. Nulo quando a fase não recebe contribuições. */
  contribuicao: { rotulo: string; enviadas: number; aceitas: number } | null;
  /** Resumo da ficha, na Fase 1. */
  ficha: { objetivo: string; resultadoEsperado: string } | null;
  avisos: AvisoApi[];
}

export interface CartaoMesaApi {
  id: string;
  numero: number;
  nome: string;
  codigo: string;
  processo: string | null;
  faseAtual: number;
  faseNome: string;
  passoAtual: number;
  totalPassos: number;
  estado: EstadoBase;
  estadoMostrado: EstadoMostrado;
  pediuAjuda: boolean;
  chamadoId: string | null;
  pessoas: number;
  final: boolean;
  versao: number;
  relogio: RelogioApi;
  /** O que falta para a fase atual, usado no diálogo de forçar avanço. */
  faltaNaFase: string | null;
}

export interface PainelApi {
  agora: string;
  evento: EventoApi;
  fases: { ordem: number; nome: string; nomeCurto: string; duracaoMin: number }[];
  mesas: CartaoMesaApi[];
}

export interface ErroApi {
  erro: string;
}
