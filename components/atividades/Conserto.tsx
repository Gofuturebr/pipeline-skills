"use client";

import { useState } from "react";
import { Botao } from "@/components/base/Botao";
import { Icone } from "@/components/base/Icone";
import { Markdown } from "@/components/base/Markdown";
import { motivoDaRecusa } from "@/lib/conferencias";
import { acharSensivel, mensagemSensivel } from "@/lib/sensivel";
import type { ConsertoApi } from "@/lib/tipos-api";
import { Erro, Feito, TextoSendoEscrito, useEscritaDaIA } from "./comum";
import type { PropsAtividade } from "./tipos";

// Conserto (Fase 6): a mesa marca a camada que falhou, a IA propõe o menor
// conserto duradouro e a mesa aprova. Todo conserto entra em notas.md.

const CAMADAS: { chave: NonNullable<ConsertoApi["camada"]>; titulo: string; texto: string }[] = [
  { chave: "processo", titulo: "Processo", texto: "Faltou um passo, uma regra ou uma decisão no SKILL.md." },
  { chave: "caixa", titulo: "Caixa", texto: "Um modelo da pasta está errado, ou faltou um modelo e a IA refez do zero." },
  { chave: "prova", titulo: "Prova", texto: "Faltou uma conferência que pegaria o erro antes de entregar." },
];

export function AtividadeConserto(props: PropsAtividade) {
  const etapa = String(props.passo.config.etapa ?? "camada");
  const c = props.estado.conserto;
  if (!c?.id) return <p className="text-xl">Escolham a falha no passo anterior.</p>;
  return (
    <div className="flex flex-col gap-6">
      <p className="rounded-folha border-2 border-linha bg-bancada p-4 text-xl">
        <span className="font-bold">Falha escolhida: </span>
        {c.oQueDeuErrado}
      </p>
      {etapa === "camada" ? <Camada {...props} conserto={c} /> : <Proposta {...props} conserto={c} />}
    </div>
  );
}

function Camada({ estado, codigo, aoAgir, somenteLeitura, conserto }: PropsAtividade & { conserto: ConsertoApi }) {
  const pausada = estado.mesa.estado === "pausada";
  return (
    <ul className="grid gap-4 min-[1180px]:grid-cols-3">
      {CAMADAS.map((camada) => {
        const marcada = conserto.camada === camada.chave;
        return (
          <li key={camada.chave}>
            <button
              type="button"
              disabled={somenteLeitura || pausada || conserto.aprovado}
              aria-pressed={marcada}
              onClick={() => void aoAgir(`/api/mesa/${encodeURIComponent(codigo)}/conserto/camada`, { camada: camada.chave })}
              className={`flex h-full min-h-40 w-full flex-col gap-2 rounded-folha border-4 p-5 text-left ${
                marcada ? "border-petroleo bg-petroleo-claro" : "border-linha bg-papel"
              }`}
            >
              <span className="inline-flex items-center gap-2 font-titulo text-[28px] font-semibold">
                {marcada ? <Icone nome="visto" className="h-7 w-7 text-petroleo" /> : null}
                {camada.titulo}
              </span>
              <span className="text-xl leading-normal">{camada.texto}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Proposta(props: PropsAtividade & { conserto: ConsertoApi }) {
  const { estado, codigo, aoAgir, somenteLeitura, conserto } = props;
  const p = conserto.proposta;
  const { escrevendo, erro, pedir, setErro } = useEscritaDaIA(props.aoSubstituir);
  const [conteudo, setConteudo] = useState(p?.conteudoNovo ?? "");
  const [oQueMuda, setOQueMuda] = useState(p?.oQueMuda ?? "");
  const [nova, setNova] = useState(p?.novaConferencia ?? { descricao: "", fonte: "" });
  const [de, setDe] = useState(p);
  const [editando, setEditando] = useState(false);
  const [aprovando, setAprovando] = useState(false);
  const pausada = estado.mesa.estado === "pausada";
  const base = `/api/mesa/${encodeURIComponent(codigo)}/conserto`;

  // Proposta nova: os campos passam a ser os dela.
  if (p !== de) {
    setDe(p);
    setConteudo(p?.conteudoNovo ?? "");
    setOQueMuda(p?.oQueMuda ?? "");
    setNova(p?.novaConferencia ?? { descricao: "", fonte: "" });
  }

  if (!conserto.camada) return <p className="text-xl">Marquem a camada que falhou no passo anterior.</p>;
  if (escrevendo !== null) return <TextoSendoEscrito texto={escrevendo} rotulo="A IA está pensando no menor conserto" />;
  if (conserto.aprovado) {
    return (
      <div className="flex flex-col gap-3">
        <Feito>Conserto aprovado e registrado em notas.md.</Feito>
        <p className="text-xl">{conserto.oQueMudou}</p>
      </div>
    );
  }

  async function aprovar() {
    const texto = conserto.camada === "prova" ? `${nova.descricao} ${nova.fonte}` : conteudo;
    const achado = acharSensivel(`${texto} ${oQueMuda}`);
    if (achado) return setErro(mensagemSensivel(achado));
    if (conserto.camada === "prova") {
      const motivo = motivoDaRecusa(nova.descricao, nova.fonte, estado.evento.palavrasVagas);
      if (motivo) return setErro(motivo);
    }
    setErro(null);
    setAprovando(true);
    await aoAgir(`${base}/aprovar`, conserto.camada === "prova" ? { oQueMuda, novaConferencia: nova } : { oQueMuda, conteudoNovo: conteudo });
    setAprovando(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {erro ? <Erro texto={erro} /> : null}
      {p ? (
        <section className="flex flex-col gap-4 rounded-folha border-2 border-petroleo bg-papel p-6" aria-label="Proposta de conserto">
          {p.diagnostico ? (
            <div className="rounded-folha border-2 border-estado-atrasada p-4">
              <p className="text-lg font-bold">Mais de duas conferências falharam. Antes do conserto, a causa:</p>
              <p className="mt-1 text-xl">{p.diagnostico}</p>
            </div>
          ) : null}
          <p className="text-xl">
            <span className="font-bold">O que deu errado: </span>
            {p.oQueDeuErrado}
          </p>
          <label className="flex flex-col gap-1.5 text-xl font-bold">
            O que o conserto muda
            <input
              value={oQueMuda}
              disabled={somenteLeitura}
              onChange={(e) => setOQueMuda(e.target.value)}
              className="min-h-12 rounded-folha border-2 border-linha px-3 text-xl font-normal"
            />
          </label>
          {conserto.camada === "prova" ? (
            <div className="grid gap-3 min-[1180px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <label className="flex flex-col gap-1.5 text-lg font-bold">
                Conferência nova: o que confere
                <input value={nova.descricao} onChange={(e) => setNova({ ...nova, descricao: e.target.value })} className="min-h-12 rounded-folha border-2 border-linha px-3 text-xl font-normal" />
              </label>
              <label className="flex flex-col gap-1.5 text-lg font-bold">
                Contra qual fonte
                <input value={nova.fonte} onChange={(e) => setNova({ ...nova, fonte: e.target.value })} className="min-h-12 rounded-folha border-2 border-linha px-3 text-xl font-normal" />
              </label>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xl font-semibold">{p.arquivo}, depois do conserto</span>
                <Botao variante="discreto" onClick={() => setEditando((v) => !v)}>
                  {editando ? "Ver formatado" : "Ajustar o texto"}
                </Botao>
              </div>
              {editando ? (
                <textarea
                  rows={16}
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  className="rounded-folha border-2 border-petroleo px-3 py-2 font-mono text-lg leading-normal"
                  aria-label="Texto do arquivo depois do conserto"
                />
              ) : (
                <div className="max-h-[420px] overflow-y-auto rounded-folha border-2 border-linha p-4">
                  <Markdown texto={conteudo} />
                </div>
              )}
            </div>
          )}
          {somenteLeitura ? null : (
            <div className="flex flex-wrap gap-3">
              <Botao variante="secundario" tamanho="mesa" disabled={pausada} enviando={aprovando} textoEnviando="Guardando" onClick={aprovar}>
                Aprovar o conserto
              </Botao>
              <Botao variante="discreto" tamanho="mesa" disabled={pausada} onClick={() => void pedir(`${base}/propor`)}>
                Pedir outra proposta
              </Botao>
            </div>
          )}
        </section>
      ) : somenteLeitura ? null : (
        <div>
          <Botao variante="secundario" tamanho="mesa" disabled={pausada} onClick={() => void pedir(`${base}/propor`)}>
            Pedir a proposta da IA
          </Botao>
        </div>
      )}
    </div>
  );
}
