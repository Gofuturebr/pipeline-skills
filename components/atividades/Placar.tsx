"use client";

import { useState } from "react";
import { Botao } from "@/components/base/Botao";
import { Icone } from "@/components/base/Icone";
import { Markdown } from "@/components/base/Markdown";
import type { ResultadoConferenciaApi, RodadaApi } from "@/lib/tipos-api";
import { CasoEResultado, Erro, TextoSendoEscrito, ultimaRodada, useEscritaDaIA } from "./comum";
import type { PropsAtividade } from "./tipos";

// Placar (Fase 4): a mesa roda a tarefa, a IA confere cada item, conserta o que
// falhou e mostra uma linha por conferência, com a prova usada.

export function AtividadePlacar(props: PropsAtividade) {
  const { estado, codigo, somenteLeitura } = props;
  const rodada = ultimaRodada(estado, "prova");
  const { escrevendo, erro, pedir } = useEscritaDaIA(props.aoSubstituir);
  const pausada = estado.mesa.estado === "pausada";
  const validas = estado.conferencias.filter((c) => c.valida).length;

  if (somenteLeitura) return rodada ? <PlacarDaRodada rodada={rodada} /> : <p className="text-xl">Placar não rodado.</p>;

  return (
    <div className="flex flex-col gap-6">
      {erro ? <Erro texto={erro} /> : null}
      {escrevendo !== null ? (
        <TextoSendoEscrito texto={escrevendo} rotulo="A IA está fazendo a tarefa e conferindo" />
      ) : rodada ? (
        <PlacarDaRodada rodada={rodada} />
      ) : null}
      {escrevendo === null ? (
        <div>
          <Botao
            variante="secundario"
            tamanho="mesa"
            disabled={pausada || validas === 0}
            motivo={pausada ? "A mesa está pausada" : validas === 0 ? "Escrevam as conferências antes" : null}
            onClick={() => void pedir(`/api/mesa/${encodeURIComponent(codigo)}/prova`)}
          >
            {rodada ? "Rodar e conferir de novo" : "Rodar a tarefa e conferir"}
          </Botao>
        </div>
      ) : null}
    </div>
  );
}

export function LinhaDoPlacar({ item, extra }: { item: ResultadoConferenciaApi; extra?: React.ReactNode }) {
  const estadoItem = !item.conseguiuConferir ? "nao" : item.passou ? "passou" : "falhou";
  const visual = {
    passou: { icone: "visto" as const, cor: "text-estado-pronta", palavra: "Passou", borda: "border-linha" },
    falhou: { icone: "xis" as const, cor: "text-estado-atrasada", palavra: "Falhou", borda: "border-estado-atrasada" },
    nao: { icone: "relogio" as const, cor: "text-estado-ajuda", palavra: "Não deu para conferir", borda: "border-estado-ajuda" },
  }[estadoItem];
  return (
    <li className={`flex flex-col gap-2 rounded-folha border-2 bg-papel p-4 ${visual.borda}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-xl font-bold">
          {item.numero}. {item.descricao}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xl font-bold">
          <Icone nome={visual.icone} className={`h-6 w-6 ${visual.cor}`} />
          {visual.palavra}
        </span>
      </div>
      <p className="text-lg leading-normal">
        <span className="text-tinta-suave">Prova: </span>
        {item.prova}
      </p>
      {extra}
    </li>
  );
}

export function PlacarDaRodada({
  rodada,
  extraDoItem,
}: {
  rodada: RodadaApi;
  extraDoItem?: (item: ResultadoConferenciaApi) => React.ReactNode;
}) {
  const [verResultado, setVerResultado] = useState(false);
  const placar = rodada.placar ?? [];
  const passaram = placar.filter((p) => p.passou).length;
  return (
    <div className="flex flex-col gap-4">
      <p className="font-titulo text-[40px] font-bold leading-tight" role="status">
        {passaram} de {placar.length} passaram
      </p>
      <ol className="flex flex-col gap-3">
        {placar.map((p) => (
          <LinhaDoPlacar key={p.id} item={p} extra={extraDoItem?.(p)} />
        ))}
      </ol>
      <button
        type="button"
        aria-expanded={verResultado}
        onClick={() => setVerResultado((v) => !v)}
        className="min-h-11 self-start text-lg font-bold text-petroleo underline underline-offset-4"
      >
        {verResultado ? "Esconder o resultado da tarefa" : "Ver o resultado da tarefa"}
      </button>
      {verResultado ? <CasoEResultado entrada={rodada.entrada} saida={<Markdown texto={rodada.saida} />} /> : null}
    </div>
  );
}
