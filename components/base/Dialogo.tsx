"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Botao } from "./Botao";

// Diálogo de confirmação: o título diz a consequência e os botões repetem o
// verbo da ação ("Avançar mesmo assim", "Cancelar").

export function Dialogo({
  aberto,
  titulo,
  children,
  textoConfirmar,
  textoEnviando,
  variante = "principal",
  enviando = false,
  aoConfirmar,
  aoCancelar,
}: {
  aberto: boolean;
  titulo: string;
  children?: ReactNode;
  textoConfirmar: string;
  textoEnviando?: string;
  variante?: "principal" | "perigo";
  enviando?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        aoCancelar();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-folha border-2 border-tinta bg-papel p-0 text-tinta backdrop:bg-tinta/40"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 className="font-titulo text-[22px] font-bold leading-tight">{titulo}</h2>
        {children ? <div className="text-[15px] leading-normal">{children}</div> : null}
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Botao variante="discreto" onClick={aoCancelar}>
            Cancelar
          </Botao>
          <Botao
            variante={variante}
            onClick={aoConfirmar}
            enviando={enviando}
            textoEnviando={textoEnviando}
            autoFocus
          >
            {textoConfirmar}
          </Botao>
        </div>
      </div>
    </dialog>
  );
}
