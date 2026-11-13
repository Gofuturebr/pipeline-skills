"use client";

import { memo } from "react";
import { Botao } from "@/components/base/Botao";
import { CronometroFase } from "@/components/base/Cronometro";
import { ESTADOS, SeloEstado } from "@/components/base/Selo";
import type { CartaoMesaApi } from "@/lib/tipos-api";
import { useAgora } from "@/lib/cliente/relogio";
import { estadoMostrado, segundosRestantesFase } from "@/lib/tempo";
import type { EstadoMostrado } from "@/lib/maquina";

// Cartão da mesa: posição fixa por número. Ordem do conteúdo: nome, processo,
// fase e passo, tempo na fase, estado, pessoas conectadas, ação principal.

export type AcaoCartao = "avancar" | "forcar" | "atender" | "retomar";

/** O estado "atrasada" muda com o relógio, sem precisar de sinal do servidor. */
export function useEstadoAoVivo(m: CartaoMesaApi, defasagem: number): EstadoMostrado {
  const agora = useAgora(defasagem);
  return estadoMostrado(m.estado, segundosRestantesFase(m.relogio, m.relogio.duracaoMin, agora));
}

function CartaoDaMesaBase({
  mesa,
  defasagem,
  pulsar,
  podeFase,
  podePausar,
  aoAbrir,
  aoAgir,
}: {
  mesa: CartaoMesaApi;
  defasagem: number;
  pulsar: boolean;
  podeFase: boolean;
  podePausar: boolean;
  aoAbrir: (id: string) => void;
  aoAgir: (mesa: CartaoMesaApi, acao: AcaoCartao) => void;
}) {
  const estado = useEstadoAoVivo(mesa, defasagem);
  const faixa = mesa.pediuAjuda ? ESTADOS.ajuda.fundo : ESTADOS[estado].fundo;

  let acao: React.ReactNode = null;
  if (mesa.pediuAjuda) {
    acao = (
      <Botao variante="principal" onClick={() => aoAgir(mesa, "atender")} className="w-full">
        Atender
      </Botao>
    );
  } else if (mesa.estado === "pausada") {
    acao = podePausar ? (
      <Botao variante="secundario" onClick={() => aoAgir(mesa, "retomar")} className="w-full">
        Retomar
      </Botao>
    ) : null;
  } else if (mesa.faseAtual >= 7) {
    acao = <span className="flex min-h-11 items-center text-[13px] text-tinta-suave">Última fase</span>;
  } else if (mesa.estado === "pronta") {
    acao = podeFase ? (
      <Botao variante="principal" onClick={() => aoAgir(mesa, "avancar")} className="w-full">
        Avançar
      </Botao>
    ) : null;
  } else {
    acao = podeFase ? (
      <Botao variante="discreto" onClick={() => aoAgir(mesa, "forcar")} className="w-full">
        Avançar
      </Botao>
    ) : null;
  }

  return (
    <article
      className={`relative flex min-w-0 overflow-hidden rounded-folha border-2 border-linha bg-papel ${
        pulsar ? "movimento-pulso" : ""
      }`}
      aria-label={`${mesa.nome}, ${mesa.pediuAjuda ? "pediu ajuda" : ESTADOS[estado].palavra}`}
    >
      <span aria-hidden className={`w-2 shrink-0 ${faixa}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3 text-[15px]">
        <button
          type="button"
          onClick={() => aoAbrir(mesa.id)}
          className="flex min-w-0 flex-col items-stretch gap-0.5 rounded-folha text-left"
        >
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate font-titulo text-[17px] font-bold">{mesa.nome}</span>
            <CronometroFase relogio={mesa.relogio} defasagem={defasagem} className="text-[15px]" />
          </span>
          <span className="truncate text-[13px] text-tinta-suave">{mesa.processo ?? "Sem processo"}</span>
          <span className="numeros-tabulares">
            Fase {mesa.faseAtual}, passo {mesa.passoAtual} de {mesa.totalPassos}
          </span>
          <span className="flex flex-wrap items-center justify-between gap-x-2">
            {mesa.pediuAjuda ? <SeloEstado estado="ajuda" /> : <SeloEstado estado={estado} />}
            <span className="text-[13px] text-tinta-suave">
              {mesa.pessoas === 1 ? "1 pessoa" : `${mesa.pessoas} pessoas`}
            </span>
          </span>
        </button>
        {acao}
      </div>
    </article>
  );
}

// O painel atualiza cartão por cartão: só o cartão que mudou é redesenhado.
export const CartaoDaMesa = memo(CartaoDaMesaBase);
