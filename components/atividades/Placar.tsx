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
  const modo = String(props.passo.config.modo ?? "prova");
  if (modo === "teste") return <TesteDaParceira {...props} />;
  if (modo === "observar") return <ObservarFalhas {...props} />;
  return <PlacarDaProva {...props} />;
}

function PlacarDaProva(props: PropsAtividade) {
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

/** Fase 5: o Testador roda a skill da parceira com o caso novo, sem explicação da outra mesa. */
function TesteDaParceira(props: PropsAtividade) {
  const { estado, codigo, somenteLeitura } = props;
  const teste = estado.teste;
  const { escrevendo, erro, pedir } = useEscritaDaIA(props.aoSubstituir);
  if (!teste) return null;
  const parceira = teste.parceira?.nome ?? "mesa parceira";
  if (somenteLeitura) return teste.rodada ? <PlacarDaRodada rodada={teste.rodada} /> : null;
  if (!teste.liberado) {
    return <p className="rounded-folha border-2 border-linha bg-bancada p-5 text-2xl">{teste.motivoEspera}</p>;
  }
  const pausada = estado.mesa.estado === "pausada";
  return (
    <div className="flex flex-col gap-6">
      <p className="text-2xl font-bold">Vocês estão testando a skill da {parceira}. A pasta dela está do lado direito, só para ler.</p>
      {erro ? <Erro texto={erro} /> : null}
      {escrevendo !== null ? (
        <TextoSendoEscrito texto={escrevendo} rotulo={`A IA está usando a skill da ${parceira}`} />
      ) : teste.rodada ? (
        <PlacarDaRodada rodada={teste.rodada} />
      ) : null}
      {escrevendo === null && !teste.enviado ? (
        <div>
          <Botao
            variante="secundario"
            tamanho="mesa"
            disabled={pausada}
            motivo={pausada ? "A mesa está pausada" : null}
            onClick={() => void pedir(`/api/mesa/${encodeURIComponent(codigo)}/teste/rodar`)}
          >
            {teste.rodada ? "Rodar o teste de novo" : `Rodar a skill da ${parceira} com o caso novo`}
          </Botao>
        </div>
      ) : null}
    </div>
  );
}

/** Fase 5: o Testador escreve o que aconteceu em cada falha. */
function ObservarFalhas(props: PropsAtividade) {
  const { estado, codigo, aoAgir, somenteLeitura } = props;
  const rodada = estado.teste?.rodada;
  if (!rodada) return <p className="text-xl">Rodem o teste no passo anterior.</p>;
  const bloqueado = somenteLeitura || Boolean(estado.teste?.enviado) || estado.mesa.estado === "pausada";
  const falhas = (rodada.placar ?? []).filter((p) => !p.passou);
  return (
    <div className="flex flex-col gap-4">
      {falhas.length === 0 ? (
        <p className="text-2xl font-bold">Nenhuma conferência falhou. Não há o que observar.</p>
      ) : (
        <p className="text-xl">Para cada falha, escrevam o que aconteceu no resultado: o que veio errado ou o que faltou.</p>
      )}
      <PlacarDaRodada
        rodada={rodada}
        extraDoItem={(item) =>
          item.passou ? null : (
            <ObservacaoDaFalha
              key={`${item.id}:${item.observacao}`}
              inicial={item.observacao}
              bloqueado={bloqueado}
              aoGuardar={(texto) =>
                aoAgir(`/api/mesa/${encodeURIComponent(codigo)}/teste/observar`, { resultadoId: item.id, texto })
              }
            />
          )
        }
      />
    </div>
  );
}

function ObservacaoDaFalha({
  inicial,
  bloqueado,
  aoGuardar,
}: {
  inicial: string;
  bloqueado: boolean;
  aoGuardar: (texto: string) => Promise<boolean>;
}) {
  const [texto, setTexto] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  return (
    <label className="flex flex-col gap-1.5 text-lg font-bold">
      O que aconteceu?
      <textarea
        rows={2}
        value={texto}
        disabled={bloqueado}
        maxLength={600}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={async () => {
          if (texto.trim() === inicial.trim()) return;
          setGuardando(true);
          await aoGuardar(texto);
          setGuardando(false);
        }}
        className={`rounded-folha border-2 px-3 py-2 text-xl font-normal ${inicial.trim() ? "border-linha" : "border-estado-atrasada"}`}
      />
      {guardando ? <span className="text-base font-normal text-tinta-suave">Guardando</span> : null}
    </label>
  );
}
