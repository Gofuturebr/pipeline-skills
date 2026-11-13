"use client";

import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

// Campo: rótulo sempre visível acima, erro escrito abaixo com o que fazer.

interface Base {
  rotulo: string;
  erro?: string | null;
  ajuda?: string;
  tamanho?: "mesa" | "normal" | "celular";
}

const TEXTO = { mesa: "text-xl", normal: "text-[15px]", celular: "text-[17px]" };

export function Campo({
  rotulo,
  erro,
  ajuda,
  tamanho = "normal",
  className = "",
  ...resto
}: Base & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="font-bold text-tinta">
        {rotulo}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined}
        className={`min-h-12 rounded-folha border-2 bg-papel px-3 ${TEXTO[tamanho]} ${
          erro ? "border-estado-atrasada" : "border-linha"
        }`}
        {...resto}
      />
      {ajuda && !erro ? (
        <span id={`${id}-ajuda`} className="text-sm text-tinta-suave">
          {ajuda}
        </span>
      ) : null}
      {erro ? (
        <span id={`${id}-erro`} className="text-sm font-bold text-tinta">
          {erro}
        </span>
      ) : null}
    </div>
  );
}

export function CampoTexto({
  rotulo,
  erro,
  ajuda,
  tamanho = "normal",
  className = "",
  ...resto
}: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="font-bold text-tinta">
        {rotulo}
      </label>
      <textarea
        id={id}
        aria-invalid={erro ? true : undefined}
        className={`min-h-24 rounded-folha border-2 bg-papel px-3 py-2 ${TEXTO[tamanho]} ${
          erro ? "border-estado-atrasada" : "border-linha"
        }`}
        {...resto}
      />
      {ajuda && !erro ? <span className="text-sm text-tinta-suave">{ajuda}</span> : null}
      {erro ? <span className="text-sm font-bold text-tinta">{erro}</span> : null}
    </div>
  );
}
