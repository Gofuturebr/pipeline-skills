"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

// Botão de docs/frontend.md, seção 8: um principal por tela; desabilitado sempre
// com o motivo escrito ao lado; em envio, o texto vira gerúndio.

type Variante = "principal" | "secundario" | "discreto" | "perigo";
type Tamanho = "mesa" | "normal" | "celular";

const VARIANTES: Record<Variante, string> = {
  principal: "bg-petroleo text-papel border-petroleo hover:bg-[#0b4a58]",
  secundario: "bg-papel text-petroleo border-petroleo hover:bg-petroleo-claro",
  discreto: "bg-transparent text-tinta border-transparent underline-offset-4 hover:underline",
  perigo: "bg-papel text-estado-atrasada border-estado-atrasada hover:bg-[#fdebe3]",
};

const TAMANHOS: Record<Tamanho, string> = {
  mesa: "min-h-14 px-6 text-xl",
  normal: "min-h-11 px-4 text-[15px]",
  celular: "min-h-12 px-5 text-[17px]",
};

export interface PropsBotao extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
  /** Motivo escrito ao lado quando o botão está desabilitado. */
  motivo?: string | null;
  enviando?: boolean;
  textoEnviando?: string;
  children: ReactNode;
}

export function Botao({
  variante = "secundario",
  tamanho = "normal",
  motivo,
  enviando = false,
  textoEnviando,
  disabled,
  children,
  className = "",
  ...resto
}: PropsBotao) {
  const desabilitado = Boolean(disabled || enviando);
  const botao = (
    <button
      type="button"
      {...resto}
      disabled={desabilitado}
      aria-busy={enviando || undefined}
      className={`transicao-resposta inline-flex items-center justify-center gap-2 rounded-botao border-2 font-bold disabled:cursor-not-allowed disabled:border-linha disabled:bg-bancada disabled:text-tinta-suave ${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${className}`}
    >
      {enviando && textoEnviando ? textoEnviando : children}
    </button>
  );
  if (!disabled || !motivo) return botao;
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      {botao}
      <span className="text-tinta-suave">{motivo}</span>
    </span>
  );
}
