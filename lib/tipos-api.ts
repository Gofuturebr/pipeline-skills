// Formato das respostas das rotas de API, usado pelo servidor e pelas telas.
import type { Avaliacao, PapelDoPasso, TipoAtividade } from "@/lib/jornada";
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
