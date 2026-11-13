import type { EstadoBase, EstadoMostrado } from "./maquina";

// Cronômetros. Tudo é calculado a partir de horários guardados no banco, assim
// nenhum processo precisa ficar contando o tempo (RN04: o tempo só informa).

export interface RelogioFase {
  faseIniciadaEm: string | Date;
  pausadaDesde: string | Date | null;
  pausaAcumuladaS: number;
  ajusteTempoS: number;
}

function ms(d: string | Date): number {
  return typeof d === "string" ? Date.parse(d) : d.getTime();
}

/** Segundos que faltam na fase. Negativo quando o tempo já passou. */
export function segundosRestantesFase(r: RelogioFase, duracaoMin: number, agora: number): number {
  const pausaEmCurso = r.pausadaDesde ? Math.max(0, agora - ms(r.pausadaDesde)) / 1000 : 0;
  const decorrido = (agora - ms(r.faseIniciadaEm)) / 1000 - r.pausaAcumuladaS - pausaEmCurso;
  return Math.round(duracaoMin * 60 + r.ajusteTempoS - decorrido);
}

/** Segundos na fase, descontadas as pausas. */
export function segundosNaFase(r: RelogioFase, agora: number): number {
  const pausaEmCurso = r.pausadaDesde ? Math.max(0, agora - ms(r.pausadaDesde)) / 1000 : 0;
  return Math.max(0, Math.round((agora - ms(r.faseIniciadaEm)) / 1000 - r.pausaAcumuladaS - pausaEmCurso));
}

/** "Atrasada" não é guardado: vem do tempo esgotado numa mesa em andamento (RN04). */
export function estadoMostrado(estado: EstadoBase, restanteS: number): EstadoMostrado {
  if (estado === "em_andamento" && restanteS < 0) return "atrasada";
  return estado;
}

function dois(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Formata segundos como 18:24 ou 1:42:10. Valores negativos passam a contar
 * para cima com sinal de mais, como pede o componente Cronômetro.
 */
export function formatarCronometro(segundos: number): string {
  const passou = segundos < 0;
  const s = Math.abs(Math.trunc(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const resto = s % 60;
  const corpo = h > 0 ? `${h}:${dois(m)}:${dois(resto)}` : `${dois(m)}:${dois(resto)}`;
  return passou ? `+${corpo}` : corpo;
}
