"use client";

import { useState } from "react";
import { Icone } from "@/components/base/Icone";
import { Markdown } from "@/components/base/Markdown";
import { lerFluxo } from "@/lib/cliente/fluxo";
import type { EstadoMesaApi, RodadaApi } from "@/lib/tipos-api";

// Peças comuns às atividades que chamam a IA aos poucos.

export function useEscritaDaIA(aoSubstituir: (e: EstadoMesaApi) => void) {
  const [escrevendo, setEscrevendo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  async function pedir(url: string, corpo?: unknown): Promise<boolean> {
    setErro(null);
    setEscrevendo("");
    const r = await lerFluxo<EstadoMesaApi>(url, corpo, (acc) => setEscrevendo(acc));
    setEscrevendo(null);
    if (r.dados) aoSubstituir(r.dados);
    if (!r.ok) setErro(r.mensagem);
    return r.ok;
  }
  return { escrevendo, erro, pedir, setErro };
}

export function TextoSendoEscrito({ texto, rotulo = "A IA está escrevendo" }: { texto: string; rotulo?: string }) {
  return (
    <div className="rounded-folha border-2 border-petroleo bg-papel p-6" aria-live="polite" aria-busy>
      <p className="mb-4 inline-flex items-center gap-2 text-lg font-bold text-petroleo">
        <Icone nome="andamento" className="h-5 w-5" />
        {rotulo}
      </p>
      {texto ? <Markdown texto={texto} /> : <p className="text-xl text-tinta-suave">Lendo a pasta da skill.</p>}
    </div>
  );
}

export function Erro({ texto }: { texto: string }) {
  return (
    <p role="alert" className="rounded-folha border-2 border-estado-atrasada bg-papel p-4 text-xl font-bold">
      {texto}
    </p>
  );
}

export function Feito({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-xl font-bold" role="status">
      <Icone nome="visto" className="h-6 w-6 text-estado-pronta" />
      {children}
    </p>
  );
}

/** Última rodada da mesa com a própria pasta, de um ou mais tipos. */
export function ultimaRodada(estado: EstadoMesaApi, ...tipos: RodadaApi["tipo"][]): RodadaApi | null {
  const lista = estado.rodadas.filter((r) => tipos.includes(r.tipo) && r.pastaMesaId === estado.mesa.id);
  return lista[lista.length - 1] ?? null;
}

/** Divide o resultado em blocos (parágrafos), para congelar parte por parte. */
export function blocosDoResultado(texto: string): string[] {
  return texto
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
}

export function CasoEResultado({ entrada, saida }: { entrada: string; saida: React.ReactNode }) {
  return (
    <div className="grid gap-4 min-[1180px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section className="flex flex-col gap-2 rounded-folha border-2 border-linha bg-bancada p-5">
        <h3 className="text-lg font-bold text-tinta-suave">Caso de entrada</h3>
        <p className="whitespace-pre-wrap text-xl leading-normal">{entrada}</p>
      </section>
      <section className="flex flex-col gap-2 rounded-folha border-2 border-petroleo bg-papel p-5">
        <h3 className="text-lg font-bold text-tinta-suave">Resultado da IA</h3>
        {saida}
      </section>
    </div>
  );
}
