"use client";

import { Botao } from "@/components/base/Botao";

export function BotaoImprimir() {
  return (
    <Botao variante="principal" onClick={() => window.print()}>
      Imprimir os cartões
    </Botao>
  );
}
