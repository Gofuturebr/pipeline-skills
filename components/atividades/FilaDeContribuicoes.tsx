"use client";

import { useState } from "react";
import { Botao } from "@/components/base/Botao";
import type { ContribuicaoApi, EstadoMesaApi } from "@/lib/tipos-api";

// Fila do que o grupo enviou pelo celular. O Piloto aceita ou descarta cada item
// (seção 4 da especificação, caixa de contribuições).

export function FilaDeContribuicoes({
  estado,
  codigo,
  aoAgir,
  somenteLeitura,
  destaque = false,
}: {
  estado: EstadoMesaApi;
  codigo: string;
  aoAgir: (url: string, corpo?: unknown) => Promise<boolean>;
  somenteLeitura: boolean;
  /** Na atividade própria da fila, os itens ficam maiores. */
  destaque?: boolean;
}) {
  const { pendentes, aceitas } = estado.contribuicoes;
  const [emEnvio, setEmEnvio] = useState<string | null>(null);
  const [verAceitas, setVerAceitas] = useState(false);
  const pausada = estado.mesa.estado === "pausada";

  async function decidir(c: ContribuicaoApi, novo: "aceita" | "descartada" | "pendente") {
    setEmEnvio(c.id);
    await aoAgir(`/api/mesa/${encodeURIComponent(codigo)}/contribuicoes/${c.id}`, { estado: novo });
    setEmEnvio(null);
  }

  const texto = destaque ? "text-2xl" : "text-xl";

  return (
    <section aria-label="Contribuições do grupo" className="flex flex-col gap-4">
      <h3 className="font-titulo text-[28px] font-semibold leading-tight">
        Contribuições do grupo ({pendentes.length})
      </h3>
      <div aria-live="polite" className="flex flex-col gap-3">
        {pendentes.length === 0 ? (
          <p className="text-xl text-tinta-suave">
            Nada novo. O que o grupo enviar pelo celular aparece aqui.
          </p>
        ) : (
          pendentes.map((c) => (
            <article key={c.id} className="flex flex-col gap-3 rounded-folha border-2 border-linha bg-papel p-4">
              <p className={`${texto} whitespace-pre-wrap leading-normal`}>{c.texto}</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="mr-auto text-base text-tinta-suave">{c.autor ? `Enviado por ${c.autor}` : "Enviado pelo celular"}</span>
                {somenteLeitura ? null : (
                  <>
                    <Botao
                      variante="secundario"
                      tamanho="mesa"
                      disabled={pausada}
                      enviando={emEnvio === c.id}
                      textoEnviando="Guardando"
                      onClick={() => decidir(c, "aceita")}
                    >
                      Aceitar
                    </Botao>
                    <Botao variante="discreto" tamanho="mesa" disabled={pausada || emEnvio === c.id} onClick={() => decidir(c, "descartada")}>
                      Descartar
                    </Botao>
                  </>
                )}
              </div>
            </article>
          ))
        )}
      </div>
      {aceitas.length > 0 ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            aria-expanded={verAceitas}
            onClick={() => setVerAceitas((v) => !v)}
            className="min-h-11 self-start text-lg font-bold text-petroleo underline underline-offset-4"
          >
            {verAceitas ? "Esconder as aceitas" : `Ver as aceitas (${aceitas.length})`}
          </button>
          {verAceitas ? (
            <ul className="flex flex-col gap-2">
              {aceitas.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-folha bg-bancada px-4 py-3">
                  <span className="flex-1 whitespace-pre-wrap text-lg leading-normal">{c.texto}</span>
                  {somenteLeitura ? null : (
                    <Botao variante="discreto" disabled={pausada || emEnvio === c.id} onClick={() => decidir(c, "pendente")}>
                      Desfazer
                    </Botao>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
