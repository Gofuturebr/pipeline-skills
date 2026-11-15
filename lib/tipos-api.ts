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
  /** Palavras que não valem numa conferência (RN08). */
  palavrasVagas: string[];
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
    nomeSkill: string;
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
  /** Arquivos da pasta da mesa, com o conteúdo atual. */
  arquivos: ArquivoApi[];
  /** Entrevista com a IA. Só a partir da Fase 2. */
  entrevista: EntrevistaApi | null;
  /** Rodadas feitas pela mesa, da mais antiga para a mais nova. */
  rodadas: RodadaApi[];
  /** Conferências da prova (Fase 4 em diante). */
  conferencias: ConferenciaApi[];
}

export interface ResultadoConferenciaApi {
  id: string;
  conferenciaId: string | null;
  numero: number;
  descricao: string;
  fonte: string;
  passou: boolean;
  prova: string;
  conseguiuConferir: boolean;
  /** O que o Testador escreveu sobre a falha (teste cruzado). */
  observacao: string;
}

export interface RodadaApi {
  id: string;
  fase: number;
  tipo: "exemplo" | "segunda" | "prova" | "teste" | "conserto_antes" | "conserto_depois";
  /** Mesa que rodou. */
  mesaId: string;
  /** Mesa dona da pasta usada. */
  pastaMesaId: string;
  entrada: string;
  saida: string;
  reusou: { arquivo: string; para_que: string }[];
  refez: string[];
  criadoEm: string;
  /** Placar das conferências, nas rodadas que conferem. */
  placar: ResultadoConferenciaApi[] | null;
}

export interface ConferenciaApi {
  id: string;
  numero: number;
  descricao: string;
  fonte: string;
  valida: boolean;
  motivo: string | null;
}

export interface ArquivoApi {
  caminho: string;
  conteudo: string;
  versao: number;
  faseAlterada: number;
  autor: string;
  atualizadoEm: string;
}

export interface VersaoArquivoApi {
  versao: number;
  conteudo: string;
  fase: number;
  autor: string;
  criadoEm: string;
}

export interface EntrevistaApi {
  perguntas: { id: string; texto: string; tema: string | null; temaNome: string; resposta: string | null }[];
  temasCobertos: string[];
  respondidas: number;
  minimo: number;
  encerrada: boolean;
  /** A IA está escrevendo agora (em outra tela ou nesta). */
  ocupada: boolean;
  podeEncerrar: boolean;
  /** O que falta para encerrar e escrever o SKILL.md (RN07). */
  falta: string | null;
  skillAprovadaVersao: number | null;
  respostasFinais: { errou: string; esqueceu: string };
  perguntasFinais: string[];
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
  /** Caso de exemplo do kit. Só a partir da Fase 3. */
  casoExemplo: string | null;
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
  /** Pergunta da IA que a mesa está respondendo, na Fase 2. */
  perguntaAtual: string | null;
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
