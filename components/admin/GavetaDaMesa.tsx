"use client";

import { useEffect, useRef, useState } from "react";
import { Botao } from "@/components/base/Botao";
import { CampoTexto } from "@/components/base/Campo";
import { CronometroFase } from "@/components/base/Cronometro";
import { SeloEstado } from "@/components/base/Selo";
import { Icone } from "@/components/base/Icone";
import { pode, type Perfil } from "@/lib/permissoes";
import type { CartaoMesaApi } from "@/lib/tipos-api";
import { useEstadoAoVivo } from "./CartaoDaMesa";

// Gaveta de detalhe, aba "Agora". As abas Pasta, Conversa, Linha do tempo e
// Teste chegam nos Marcos 5 e 6.

export type AcaoGaveta =
  | { tipo: "avancar" | "forcar" | "voltar" | "pausar" | "retomar" | "atender" }
  | { tipo: "tempo"; minutos: number }
  | { tipo: "aviso"; texto: string }
  | { tipo: "parceira"; autoraId: string }
  | { tipo: "destravar" };

export function GavetaDaMesa({
  mesa,
  nomeFase,
  defasagem,
  perfil,
  enviando,
  aoFechar,
  aoAgir,
  outras,
}: {
  mesa: CartaoMesaApi;
  /** As outras mesas do evento, para trocar o par do teste cruzado (RN11). */
  outras: { id: string; nome: string }[];
  nomeFase: (ordem: number) => string;
  defasagem: number;
  perfil: Perfil;
  enviando: boolean;
  aoFechar: () => void;
  aoAgir: (acao: AcaoGaveta) => Promise<boolean>;
}) {
  const estado = useEstadoAoVivo(mesa, defasagem);
  const [aviso, setAviso] = useState("");
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titulo.current?.focus();
  }, [mesa.id]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) aoFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="titulo-gaveta"
      className="fixed inset-y-0 right-0 z-40 flex w-[min(30rem,100vw)] flex-col border-l-2 border-tinta bg-papel text-[15px]"
    >
      <header className="flex items-start justify-between gap-3 border-b-2 border-linha p-5">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="titulo-gaveta" ref={titulo} tabIndex={-1} className="font-titulo text-[22px] font-bold">
            {mesa.nome}
          </h2>
          <p className="truncate text-tinta-suave">{mesa.processo ?? "Sem processo"}</p>
          <p className="text-[13px] text-tinta-suave">
            Código <span className="font-mono font-semibold text-tinta">{mesa.codigo}</span>
            {" · "}
            <a className="font-bold text-petroleo underline underline-offset-4" href={`/mesa/${mesa.codigo}`} target="_blank" rel="noreferrer">
              Abrir a tela da mesa
            </a>
          </p>
        </div>
        <Botao variante="discreto" onClick={aoFechar} aria-label="Fechar detalhe da mesa">
          <Icone nome="xis" />
          Fechar
        </Botao>
      </header>

      <div role="tablist" aria-label="Detalhe da mesa" className="flex gap-1 border-b-2 border-linha px-5">
        <span role="tab" aria-selected className="border-b-4 border-petroleo px-3 py-2 font-bold">
          Agora
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5">
        <section className="flex flex-col gap-2">
          <h3 className="text-[17px] font-bold">
            Fase {mesa.faseAtual}: {nomeFase(mesa.faseAtual)}
          </h3>
          <p>
            Passo {mesa.passoAtual} de {mesa.totalPassos}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {mesa.pediuAjuda ? <SeloEstado estado="ajuda" /> : null}
            <SeloEstado estado={estado} />
            <span>
              Tempo da fase: <CronometroFase relogio={mesa.relogio} defasagem={defasagem} />
            </span>
          </div>
          <p className="text-tinta-suave">
            {mesa.faltaNaFase ? `Critério pendente: ${mesa.faltaNaFase}.` : "Critérios da fase atendidos."}
          </p>
          <p className="text-tinta-suave">
            {mesa.pessoas === 1 ? "1 pessoa conectada" : `${mesa.pessoas} pessoas conectadas`}
          </p>
        </section>

        {mesa.pediuAjuda ? (
          <Botao variante="principal" enviando={enviando} textoEnviando="Atendendo" onClick={() => aoAgir({ tipo: "atender" })}>
            Marcar chamado como atendido
          </Botao>
        ) : null}

        {pode(perfil, "avancar") ? (
          <section className="flex flex-col gap-3">
            <h3 className="text-[17px] font-bold">Fase</h3>
            <div className="flex flex-wrap gap-3">
              {mesa.estado === "pronta" ? (
                <Botao variante="principal" disabled={mesa.faseAtual >= 7} motivo={mesa.faseAtual >= 7 ? "Última fase" : null} onClick={() => aoAgir({ tipo: "avancar" })}>
                  Avançar
                </Botao>
              ) : (
                <Botao
                  variante="secundario"
                  disabled={mesa.faseAtual >= 7 || mesa.estado === "pausada"}
                  motivo={mesa.faseAtual >= 7 ? "Última fase" : mesa.estado === "pausada" ? "Retome a mesa antes" : null}
                  onClick={() => aoAgir({ tipo: "forcar" })}
                >
                  Forçar avanço
                </Botao>
              )}
              <Botao
                variante="secundario"
                disabled={mesa.faseAtual <= 0 || mesa.estado === "pausada"}
                motivo={mesa.faseAtual <= 0 ? "Já está na primeira fase" : mesa.estado === "pausada" ? "Retome a mesa antes" : null}
                onClick={() => aoAgir({ tipo: "voltar" })}
              >
                Voltar fase
              </Botao>
            </div>
          </section>
        ) : null}

        {pode(perfil, "pausar") ? (
          <section className="flex flex-col gap-3">
            <h3 className="text-[17px] font-bold">Tempo</h3>
            <div className="flex flex-wrap gap-3">
              {mesa.estado === "pausada" ? (
                <Botao variante="secundario" onClick={() => aoAgir({ tipo: "retomar" })}>
                  Retomar
                </Botao>
              ) : (
                <Botao variante="secundario" onClick={() => aoAgir({ tipo: "pausar" })}>
                  Pausar
                </Botao>
              )}
              <Botao variante="secundario" onClick={() => aoAgir({ tipo: "tempo", minutos: 5 })}>
                +5 min
              </Botao>
              <Botao variante="secundario" onClick={() => aoAgir({ tipo: "tempo", minutos: -5 })}>
                -5 min
              </Botao>
            </div>
          </section>
        ) : null}

        {pode(perfil, "teste_cruzado") ? (
          <section className="flex flex-col gap-3">
            <h3 className="text-[17px] font-bold">Skill e teste cruzado</h3>
            <label className="flex flex-col gap-1.5">
              <span className="font-bold">Esta mesa testa a skill da</span>
              <select
                value={mesa.testa?.id ?? ""}
                onChange={(e) => e.target.value && void aoAgir({ tipo: "parceira", autoraId: e.target.value })}
                className="min-h-11 rounded-folha border-2 border-linha bg-papel px-2"
              >
                <option value="">Par ainda não formado</option>
                {outras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
              <span className="text-[13px] text-tinta-suave">Trocar o par recomeça o teste desta mesa.</span>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {mesa.final ? (
                <Botao variante="secundario" onClick={() => aoAgir({ tipo: "destravar" })}>
                  Destravar a skill
                </Botao>
              ) : (
                <span className="text-tinta-suave">A skill ainda não foi marcada como final.</span>
              )}
              {mesa.temSkill ? (
                <a
                  className="inline-flex min-h-11 items-center font-bold text-petroleo underline underline-offset-4"
                  href={`/api/admin/exportar?mesa=${mesa.id}`}
                >
                  Baixar a skill (.zip)
                </a>
              ) : null}
            </div>
          </section>
        ) : null}

        {pode(perfil, "enviar_aviso") ? (
          <section className="flex flex-col gap-3">
            <CampoTexto
              rotulo={`Aviso para a ${mesa.nome}`}
              value={aviso}
              maxLength={280}
              onChange={(e) => setAviso(e.target.value)}
              ajuda={`${aviso.length} de 280 caracteres`}
            />
            <Botao
              variante="secundario"
              disabled={!aviso.trim()}
              motivo={!aviso.trim() ? "Escreva o aviso" : null}
              enviando={enviando}
              textoEnviando="Enviando"
              onClick={async () => {
                if (await aoAgir({ tipo: "aviso", texto: aviso })) setAviso("");
              }}
            >
              Enviar aviso
            </Botao>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
