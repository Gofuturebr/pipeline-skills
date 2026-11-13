"use client";

import type { ReactNode } from "react";
import { Icone, type NomeIcone } from "./Icone";

// Faixa de aviso: do gestor (fixa no pé) ou do sistema (fixa no topo).

export function Faixa({
  tipo,
  children,
  icone,
  aoFechar,
  className = "",
}: {
  tipo: "gestor" | "conexao" | "reaberta" | "revendo";
  children: ReactNode;
  icone?: NomeIcone;
  aoFechar?: () => void;
  className?: string;
}) {
  const estilo =
    tipo === "gestor"
      ? "bg-tinta text-papel"
      : tipo === "conexao"
        ? "bg-[#fdebe3] text-tinta border-b-2 border-estado-atrasada"
        : "bg-petroleo-claro text-tinta border-b-2 border-petroleo";
  return (
    <div
      role={tipo === "gestor" ? "alert" : "status"}
      className={`flex items-center gap-3 px-6 py-3 text-xl ${estilo} ${className}`}
    >
      {icone ? <Icone nome={icone} className="h-6 w-6 shrink-0" /> : null}
      <div className="flex-1">{children}</div>
      {aoFechar ? (
        <button
          type="button"
          onClick={aoFechar}
          className="min-h-11 rounded-botao px-3 text-base font-bold underline underline-offset-4"
        >
          Fechar
        </button>
      ) : null}
    </div>
  );
}
