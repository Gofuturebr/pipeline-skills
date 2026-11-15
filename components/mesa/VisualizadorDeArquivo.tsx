"use client";

import { useEffect, useState } from "react";
import { Botao } from "@/components/base/Botao";
import { Markdown } from "@/components/base/Markdown";
import type { ArquivoApi, VersaoArquivoApi } from "@/lib/tipos-api";

// Visualização de um arquivo da pasta, sobre a Folha de trabalho, com o
// histórico de versões (RN06). Só leitura: a edição fica nos passos que pedem.

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function VisualizadorDeArquivo({
  arquivo,
  urlVersoes,
  aoFechar,
}: {
  arquivo: ArquivoApi;
  /** Rota do histórico. Sem ela (pasta de outra mesa), não mostra versões. */
  urlVersoes: string | null;
  aoFechar: () => void;
}) {
  const [versoes, setVersoes] = useState<VersaoArquivoApi[] | null>(null);
  const [vendo, setVendo] = useState<VersaoArquivoApi | null>(null);
  const [verHistorico, setVerHistorico] = useState(false);

  useEffect(() => {
    const fechar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [aoFechar]);

  async function abrirHistorico() {
    setVerHistorico(true);
    if (!urlVersoes) return;
    const r = await fetch(urlVersoes, { cache: "no-store" }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
    setVersoes(r?.versoes ?? []);
  }

  const conteudo = vendo ? vendo.conteudo : arquivo.conteudo;

  return (
    <div role="dialog" aria-modal aria-label={`Arquivo ${arquivo.caminho}`} className="absolute inset-0 z-10 flex flex-col bg-papel">
      <header className="flex flex-wrap items-center gap-3 border-b-2 border-linha px-8 py-4">
        <h2 className="mr-auto font-mono text-[22px] font-semibold">{arquivo.caminho}</h2>
        <span className="text-lg text-tinta-suave">
          {vendo ? `Versão ${vendo.versao}, de ${hora(vendo.criadoEm)}` : `Versão ${arquivo.versao}, atual`}
        </span>
        {urlVersoes && !verHistorico ? (
          <Botao variante="discreto" onClick={abrirHistorico}>
            Ver versões anteriores
          </Botao>
        ) : null}
        <Botao variante="secundario" onClick={aoFechar}>
          Fechar
        </Botao>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto px-8 py-6">
          <Markdown texto={conteudo} />
        </div>
        {verHistorico ? (
          <aside aria-label="Versões" className="w-[230px] shrink-0 overflow-y-auto border-l-2 border-linha bg-bancada p-4">
            <h3 className="mb-3 font-bold">Versões</h3>
            {versoes === null ? (
              <p className="text-tinta-suave">Carregando</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {versoes.map((v, i) => (
                  <li key={v.versao}>
                    <button
                      type="button"
                      onClick={() => setVendo(i === 0 ? null : v)}
                      aria-current={(vendo?.versao ?? arquivo.versao) === v.versao}
                      className="flex min-h-11 w-full flex-col items-start rounded-[6px] px-2 py-1 text-left aria-[current=true]:bg-petroleo-claro"
                    >
                      <span className="font-bold">
                        Versão {v.versao}
                        {i === 0 ? ", atual" : ""}
                      </span>
                      <span className="text-sm text-tinta-suave">
                        {hora(v.criadoEm)}, Fase {v.fase}, {v.autor === "ia" ? "pela IA" : "pela mesa"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
