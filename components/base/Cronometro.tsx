"use client";

import { useAgora } from "@/lib/cliente/relogio";
import { formatarCronometro, segundosRestantesFase } from "@/lib/tempo";
import type { RelogioApi } from "@/lib/tipos-api";

// Cronômetro com algarismos tabulares. Ao zerar, muda para a cor de Atrasada e
// passa a contar para cima com sinal de mais.

export function CronometroFase({
  relogio,
  defasagem,
  className = "",
}: {
  relogio: RelogioApi;
  defasagem: number;
  className?: string;
}) {
  const agora = useAgora(defasagem);
  const restante = segundosRestantesFase(relogio, relogio.duracaoMin, agora);
  const passou = restante < 0;
  return (
    <span
      className={`numeros-tabulares font-titulo font-semibold ${passou ? "text-estado-atrasada" : ""} ${className}`}
      aria-label={passou ? `Tempo da fase passou ${formatarCronometro(-restante)}` : `Faltam ${formatarCronometro(restante)}`}
    >
      {formatarCronometro(restante)}
    </span>
  );
}

/** Tempo desde o início do evento (o intervalo conta, porque faz parte dos 180 minutos). */
export function CronometroEvento({
  iniciadoEm,
  defasagem,
  className = "",
}: {
  iniciadoEm: string | null;
  defasagem: number;
  className?: string;
}) {
  const agora = useAgora(defasagem);
  if (!iniciadoEm) return <span className="text-base text-tinta-suave">Evento não iniciado</span>;
  const decorrido = Math.max(0, Math.floor((agora - Date.parse(iniciadoEm)) / 1000));
  const h = Math.floor(decorrido / 3600);
  const m = Math.floor((decorrido % 3600) / 60);
  const s = decorrido % 60;
  return (
    <span className={`numeros-tabulares font-titulo font-semibold ${className}`}>
      {h}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

/** Contagem regressiva até um horário (pausa geral). */
export function ContagemAte({ ate, defasagem, className = "" }: { ate: string; defasagem: number; className?: string }) {
  const agora = useAgora(defasagem);
  const restante = Math.floor((Date.parse(ate) - agora) / 1000);
  return (
    <span className={`numeros-tabulares font-titulo font-semibold ${restante < 0 ? "text-estado-atrasada" : ""} ${className}`}>
      {formatarCronometro(restante)}
    </span>
  );
}
