// Nomes dos canais de tempo real e formato do sinal.
// O sinal nunca leva conteúdo: só avisa que algo mudou. Quem recebe busca o
// estado de novo na rota do servidor, que aplica as regras de visibilidade.

export type TipoSinal =
  | "mesa" // fase, passo, estado ou cronômetro da mesa
  | "aviso"
  | "chamado"
  | "evento" // modo, fase de referência, pausa geral, início
  | "reconectado"; // gerado no próprio navegador ao reconectar

export interface Sinal {
  tipo: TipoSinal;
  mesaId?: string;
  versao?: number;
}

export const EVENTO_SINAL = "sinal";

export const canalEvento = (eventoId: string) => `evento:${eventoId}`;
export const canalMesa = (mesaId: string) => `mesa:${mesaId}`;
export const canalAdmin = (eventoId: string) => `admin:${eventoId}`;

const PADRAO_CANAL = /^(evento|mesa|admin):[0-9a-f-]{36}$/;

export function canalValido(canal: string): boolean {
  return PADRAO_CANAL.test(canal);
}
