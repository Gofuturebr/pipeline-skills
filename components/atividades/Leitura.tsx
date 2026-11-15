"use client";

import { useState } from "react";
import { Botao } from "@/components/base/Botao";
import { Icone } from "@/components/base/Icone";
import { CAMPOS_FICHA } from "@/lib/processo";
import type { ProcessoApi } from "@/lib/tipos-api";
import { FilaDeContribuicoes } from "./FilaDeContribuicoes";
import { QrDaMesa } from "./QrDaMesa";
import type { PropsAtividade } from "./tipos";

// Fase 1: ficha do processo, kit (materiais e exemplos) e a fila do que o
// grupo envia pelo celular. O conteúdo vem em config.conteudo.

export function AtividadeLeitura(props: PropsAtividade) {
  const conteudo = String(props.passo.config.conteudo ?? "");
  if (conteudo === "contribuicoes") return <Contribuicoes {...props} />;
  if (conteudo === "entrega") return <Apresentacao {...props} />;
  const processo = props.estado.processoDetalhe;
  if (!processo) {
    return (
      <p className="text-xl leading-normal">
        Esta mesa ainda não tem um processo. Cliquem em Pedir ajuda para chamar o gestor.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {conteudo === "kit" ? <Kit processo={processo} /> : <FichaDoProcesso processo={processo} />}
      <MarcarLido {...props} />
    </div>
  );
}

function FichaDoProcesso({ processo }: { processo: ProcessoApi }) {
  return (
    <div className="rounded-folha border-2 border-linha bg-papel p-6">
      <h3 className="font-titulo text-[28px] font-semibold leading-tight">{processo.nome}</h3>
      <dl className="mt-5 flex flex-col gap-4">
        {CAMPOS_FICHA.map(({ chave, rotulo }) =>
          processo.ficha[chave] ? (
            <div key={chave} className="flex flex-col gap-1">
              <dt className="text-lg font-bold text-tinta-suave">{rotulo}</dt>
              <dd className="text-2xl leading-snug">{processo.ficha[chave]}</dd>
            </div>
          ) : null,
        )}
      </dl>
    </div>
  );
}

type Aba = "materiais" | "exemplos";

function Kit({ processo }: { processo: ProcessoApi }) {
  const [aba, setAba] = useState<Aba>("exemplos");
  const abas: { chave: Aba; texto: string }[] = [
    { chave: "exemplos", texto: "Exemplo bom e exemplo ruim" },
    { chave: "materiais", texto: "Materiais" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Kit do processo" className="flex gap-2 border-b-2 border-linha">
        {abas.map((a) => (
          <button
            key={a.chave}
            type="button"
            role="tab"
            aria-selected={aba === a.chave}
            onClick={() => setAba(a.chave)}
            className={`min-h-12 px-4 text-xl font-bold ${
              aba === a.chave ? "border-b-4 border-petroleo text-petroleo" : "text-tinta-suave"
            }`}
          >
            {a.texto}
          </button>
        ))}
      </div>
      {aba === "materiais" ? (
        <div role="tabpanel" className="whitespace-pre-wrap rounded-folha border-2 border-linha bg-papel p-6 text-xl leading-relaxed">
          {processo.kitMateriais || "Este kit não tem materiais de entrada."}
        </div>
      ) : (
        <div role="tabpanel" className="grid gap-4 min-[1180px]:grid-cols-2">
          <Exemplo titulo="Exemplo bom" icone="visto" borda="border-estado-pronta" corIcone="text-estado-pronta" texto={processo.exemploBom} />
          <Exemplo titulo="Exemplo ruim" icone="xis" borda="border-estado-atrasada" corIcone="text-estado-atrasada" texto={processo.exemploRuim} />
        </div>
      )}
    </div>
  );
}

function Exemplo({
  titulo,
  icone,
  borda,
  corIcone,
  texto,
}: {
  titulo: string;
  icone: "visto" | "xis";
  borda: string;
  corIcone: string;
  texto: string;
}) {
  return (
    <section className={`flex flex-col gap-3 rounded-folha border-2 bg-papel p-5 ${borda}`}>
      <h3 className="inline-flex items-center gap-2 font-titulo text-[26px] font-semibold">
        <Icone nome={icone} className={`h-7 w-7 ${corIcone}`} />
        {titulo}
      </h3>
      <p className="whitespace-pre-wrap text-xl leading-relaxed">{texto || "Sem exemplo neste kit."}</p>
    </section>
  );
}

function MarcarLido({ passo, codigo, aoAgir, somenteLeitura, estado }: PropsAtividade) {
  const [enviando, setEnviando] = useState(false);
  if (passo.avaliacao.emConstrucao) return null;
  if (passo.config.conteudo !== "ficha" && passo.config.conteudo !== "kit") return null;
  const marcar = async (lido: boolean) => {
    setEnviando(true);
    await aoAgir(`/api/mesa/${encodeURIComponent(codigo)}/leitura`, { passoId: passo.id, lido });
    setEnviando(false);
  };
  if (passo.lido) {
    return (
      <p className="flex flex-wrap items-center gap-4 text-xl font-bold" role="status">
        <span className="inline-flex items-center gap-2">
          <Icone nome="visto" className="h-6 w-6 text-estado-pronta" />
          Lido
        </span>
        {somenteLeitura ? null : (
          <Botao variante="discreto" disabled={enviando} onClick={() => marcar(false)}>
            Desmarcar
          </Botao>
        )}
      </p>
    );
  }
  if (somenteLeitura) return null;
  return (
    <div>
      <Botao
        variante="secundario"
        tamanho="mesa"
        enviando={enviando}
        textoEnviando="Guardando"
        disabled={estado.mesa.estado === "pausada"}
        onClick={() => marcar(true)}
      >
        Lemos
      </Botao>
    </div>
  );
}

function Contribuicoes(props: PropsAtividade) {
  // A fila vem primeiro, para caber na tela sem rolar. O QR fica ao lado, menor.
  return (
    <div className="flex flex-wrap-reverse items-start gap-6">
      <div className="flex min-w-[320px] flex-1 flex-col gap-3">
        {props.somenteLeitura ? null : (
          <p className="text-xl leading-normal text-tinta-suave">
            Leiam cada envio em voz alta e decidam: aceitar ou descartar.
          </p>
        )}
        <FilaDeContribuicoes
          estado={props.estado}
          codigo={props.codigo}
          aoAgir={props.aoAgir}
          somenteLeitura={props.somenteLeitura}
          destaque
        />
      </div>
      {props.somenteLeitura ? null : (
        <div className="w-[220px] shrink-0">
          <QrDaMesa codigo={props.codigo} endereco={props.enderecoParticipante} tamanho={150} />
        </div>
      )}
    </div>
  );
}

/** Fase 7: roteiro da apresentação de 1 minuto e o QR para baixar a skill. */
function Apresentacao({ estado, codigo, enderecoParticipante }: PropsAtividade) {
  const prova = estado.rodadas.filter((r) => r.tipo === "prova").pop();
  const conferencia = prova?.placar?.find((p) => p.passou) ?? null;
  const conserto = estado.conserto;
  const itens = [
    { titulo: "O processo", texto: estado.mesa.tarefa || estado.mesa.processo || "" },
    {
      titulo: "Uma conferência da prova",
      texto: conferencia ? `${conferencia.descricao}. Prova: ${conferencia.prova}` : "Escolham uma da seção Pronto quando.",
    },
    { titulo: "O conserto que fizemos", texto: conserto?.oQueMudou || "Contem o que mudou depois do teste cruzado." },
  ];
  return (
    <div className="flex flex-wrap items-start gap-8">
      <ol className="flex min-w-[320px] flex-1 flex-col gap-4">
        {itens.map((i, n) => (
          <li key={i.titulo} className="rounded-folha border-2 border-linha bg-papel p-5">
            <p className="font-titulo text-[26px] font-semibold">
              {n + 1}. {i.titulo}
            </p>
            <p className="mt-2 text-xl leading-normal">{i.texto}</p>
          </li>
        ))}
      </ol>
      <div className="flex w-[260px] flex-col gap-3">
        <QrDaMesa codigo={codigo} endereco={enderecoParticipante} tamanho={200} />
        <p className="text-lg leading-snug">
          {estado.mesa.final ? "Cada pessoa lê o QR e toca em Baixar a pasta." : "O botão de baixar aparece no celular quando a skill for marcada como final."}
        </p>
      </div>
    </div>
  );
}
