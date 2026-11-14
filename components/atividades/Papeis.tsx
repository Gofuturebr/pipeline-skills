"use client";

import { useState } from "react";
import { Botao } from "@/components/base/Botao";
import { Icone } from "@/components/base/Icone";
import type { PapelApi } from "@/lib/tipos-api";
import type { PropsAtividade } from "./tipos";
import { QrDaMesa } from "./QrDaMesa";

// Fase 0: check-in pelo QR, distribuição dos papéis e confirmação da formação.
// A variante vem em config.variante: "checkin", "distribuir" ou "confirmar".

export function AtividadePapeis(props: PropsAtividade) {
  const variante = String(props.passo.config.variante ?? "distribuir");
  if (props.somenteLeitura || variante === "confirmar") return <ResumoDosPapeis papeis={props.estado.papeis} />;
  if (variante === "checkin") return <CheckIn {...props} />;
  return <Distribuir {...props} />;
}

function CheckIn({ estado, codigo, enderecoParticipante }: PropsAtividade) {
  const pessoas = estado.participantes;
  return (
    <div className="flex flex-wrap items-start gap-8">
      <QrDaMesa codigo={codigo} endereco={enderecoParticipante} />
      <div className="flex min-w-[240px] flex-1 flex-col gap-4">
        <h3 className="font-titulo text-[28px] font-semibold leading-tight">
          {pessoas.length === 0
            ? "Ninguém entrou ainda"
            : pessoas.length === 1
              ? "1 pessoa entrou"
              : `${pessoas.length} pessoas entraram`}
        </h3>
        {pessoas.length > 0 ? (
          <ul className="flex flex-wrap gap-3" aria-live="polite">
            {pessoas.map((p) => (
              <li key={p.id} className="rounded-full border-2 border-linha bg-papel px-4 py-2 text-xl font-bold">
                {p.nome}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-lg leading-normal text-tinta-suave">
          Quem estiver sem celular participa do mesmo jeito. No próximo passo, o nome entra na distribuição dos papéis.
        </p>
      </div>
    </div>
  );
}

function ResumoDosPapeis({ papeis }: { papeis: PapelApi[] }) {
  return (
    <ul className="grid gap-3 min-[1180px]:grid-cols-2">
      {papeis.map((p) => (
        <li key={p.papel} className="flex items-center justify-between gap-4 rounded-folha border-2 border-linha bg-papel px-5 py-4">
          <span className="text-xl font-bold">{p.nome}</span>
          {p.pessoa ? (
            <span className="text-2xl">{p.pessoa}</span>
          ) : (
            <span className="inline-flex items-center gap-2 text-xl text-tinta-suave">
              <Icone nome="relogio" className="h-5 w-5 text-estado-atrasada" />
              Sem nome
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

const OUTRO = "__outro__";

function Distribuir({ estado, codigo, aoAgir }: PropsAtividade) {
  const pausada = estado.mesa.estado === "pausada";
  // Nomes de quem entrou pelo celular, sem repetir.
  const nomes = estado.participantes.filter(
    (p, i, lista) => lista.findIndex((q) => q.nome.toLowerCase() === p.nome.toLowerCase()) === i,
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg leading-normal text-tinta-suave">
        Uma pessoa pode ficar com dois papéis. Em mesas de 5 pessoas, o Piloto também é o Porta-voz.
      </p>
      <ul className="grid gap-4 min-[1180px]:grid-cols-2">
        {estado.papeis.map((p) => (
          <CartaoDoPapel
            key={p.papel}
            papel={p}
            nomes={nomes}
            desabilitado={pausada}
            aoEscolher={(nome, participanteId) =>
              aoAgir(`/api/mesa/${encodeURIComponent(codigo)}/papel`, { papel: p.papel, nome, participanteId })
            }
          />
        ))}
      </ul>
    </div>
  );
}

function CartaoDoPapel({
  papel,
  nomes,
  desabilitado,
  aoEscolher,
}: {
  papel: PapelApi;
  nomes: { id: string; nome: string }[];
  desabilitado: boolean;
  aoEscolher: (nome: string, participanteId: string | null) => Promise<boolean>;
}) {
  const [digitando, setDigitando] = useState(false);
  const [outro, setOutro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const idSelect = `papel-${papel.papel}`;

  // O valor do seletor: a pessoa escolhida da lista, ou "outro nome" se foi digitado.
  const daLista = papel.participanteId
    ? nomes.find((n) => n.id === papel.participanteId)
    : nomes.find((n) => papel.pessoa && n.nome.toLowerCase() === papel.pessoa.toLowerCase());
  const valor = digitando ? OUTRO : daLista ? daLista.id : papel.pessoa ? OUTRO : "";

  async function escolher(nome: string, participanteId: string | null) {
    setEnviando(true);
    const ok = await aoEscolher(nome, participanteId);
    setEnviando(false);
    if (ok) {
      setDigitando(false);
      setOutro("");
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-folha border-2 border-linha bg-papel p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-titulo text-[26px] font-semibold leading-tight">{papel.nome}</h3>
        {papel.pessoa ? <Icone nome="visto" className="h-7 w-7 shrink-0 text-estado-pronta" /> : null}
      </div>
      <p className="text-lg leading-normal">{papel.descricao}</p>
      <label htmlFor={idSelect} className="font-bold">
        Quem fica com este papel
      </label>
      <select
        id={idSelect}
        value={valor}
        disabled={desabilitado || enviando}
        onChange={(e) => {
          const v = e.target.value;
          if (v === OUTRO) {
            setDigitando(true);
            setOutro(papel.pessoa && !daLista ? papel.pessoa : "");
            return;
          }
          setDigitando(false);
          if (v === "") void escolher("", null);
          else {
            const n = nomes.find((x) => x.id === v);
            if (n) void escolher(n.nome, n.id);
          }
        }}
        className="min-h-14 rounded-folha border-2 border-linha bg-papel px-3 text-xl"
      >
        <option value="">Ninguém ainda</option>
        {nomes.map((n) => (
          <option key={n.id} value={n.id}>
            {n.nome}
          </option>
        ))}
        <option value={OUTRO}>{papel.pessoa && !daLista ? papel.pessoa : "Digitar outro nome"}</option>
      </select>
      {digitando ? (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (outro.trim()) void escolher(outro, null);
          }}
        >
          <label className="flex flex-1 flex-col gap-1.5 font-bold">
            Nome
            <input
              autoFocus
              value={outro}
              maxLength={30}
              onChange={(e) => setOutro(e.target.value)}
              className="min-h-14 rounded-folha border-2 border-linha bg-papel px-3 text-xl font-normal"
            />
          </label>
          <Botao
            type="submit"
            variante="secundario"
            tamanho="mesa"
            disabled={!outro.trim()}
            enviando={enviando}
            textoEnviando="Guardando"
          >
            Guardar
          </Botao>
        </form>
      ) : null}
    </li>
  );
}
