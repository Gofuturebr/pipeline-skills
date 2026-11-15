"use client";

import { Botao } from "@/components/base/Botao";

export function BotaoImprimir({ texto = "Imprimir os cartões" }: { texto?: string }) {
  return (
    <Botao variante="principal" onClick={() => window.print()}>
      {texto}
    </Botao>
  );
}
