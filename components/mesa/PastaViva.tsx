"use client";

import type { ArquivoApi } from "@/lib/tipos-api";

// Pasta viva: desenhada como pasta de arquivo, com aba e cor amarela. É o único
// elemento quente da tela. Um ponto marca o que foi criado ou alterado na fase
// atual. Clicar num arquivo abre a visualização sobre a Folha de trabalho.

const RECENTE_MS = 6000;

export function PastaViva({
  nomeSkill,
  arquivos,
  faseAtual,
  agora,
  aoAbrir,
  rotulo,
  somenteLeitura = false,
}: {
  nomeSkill: string;
  arquivos: ArquivoApi[];
  faseAtual: number;
  agora: number;
  aoAbrir: (caminho: string) => void;
  /** Texto da aba quando a pasta é de outra mesa. */
  rotulo?: string;
  somenteLeitura?: boolean;
}) {
  const raiz = arquivos.filter((a) => !a.caminho.includes("/"));
  const pasta = (prefixo: string) => arquivos.filter((a) => a.caminho.startsWith(`${prefixo}/`));
  const grupos: { nome: string | null; itens: ArquivoApi[] }[] = [
    { nome: null, itens: raiz.filter((a) => a.caminho === "SKILL.md") },
    { nome: "arquivos/", itens: pasta("arquivos") },
    { nome: "exemplos/", itens: pasta("exemplos") },
    { nome: null, itens: raiz.filter((a) => a.caminho !== "SKILL.md") },
  ];
  const novosNaFase = arquivos.some((a) => a.faseAlterada === faseAtual);
  const corAba = somenteLeitura ? "bg-petroleo text-papel border-petroleo" : "bg-pasta-sombra border-pasta-sombra text-tinta";
  const corPasta = somenteLeitura ? "border-petroleo bg-petroleo-claro" : "border-pasta-sombra bg-pasta shadow-[0_2px_0_#c98f12]";

  const item = (a: ArquivoApi, recuo: boolean) => {
    const nome = a.caminho.split("/").pop();
    const recente = agora - Date.parse(a.atualizadoEm) < RECENTE_MS;
    const novo = a.faseAlterada === faseAtual;
    return (
      <li key={a.caminho} className={recente ? "movimento-guardar" : ""}>
        <button
          type="button"
          onClick={() => aoAbrir(a.caminho)}
          className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-[6px] px-2 text-left font-mono text-[16px] hover:bg-papel/60 ${
            recuo ? "pl-6" : ""
          }`}
        >
          <span className="truncate">{nome}</span>
          {novo ? (
            <span aria-label="novo ou alterado nesta fase" className="text-[22px] leading-none text-tinta">
              •
            </span>
          ) : null}
        </button>
      </li>
    );
  };

  return (
    <section aria-label={rotulo ?? "Pasta viva"} className="flex h-full flex-col gap-4 overflow-y-auto px-5 py-6">
      <div className="relative pt-7">
        <div
          className={`absolute left-0 top-0 h-8 max-w-[92%] truncate rounded-t-[8px] border-2 border-b-0 px-3 pt-1 font-mono text-[15px] font-semibold ${corAba}`}
        >
          {rotulo ?? (nomeSkill ? `/${nomeSkill}` : "/skill-da-mesa")}
        </div>
        <div className={`min-h-64 rounded-b-[8px] rounded-tr-[8px] border-2 px-3 py-4 ${corPasta}`}>
          {arquivos.length === 0 ? (
            <p className="px-1 text-xl leading-snug text-tinta">A skill de vocês vai aparecer aqui</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {grupos.map((g, i) =>
                g.itens.length === 0 ? null : g.nome ? (
                  <li key={g.nome}>
                    <span className="block px-2 py-1 font-mono text-[16px] font-semibold">{g.nome}</span>
                    <ul>{g.itens.map((a) => item(a, true))}</ul>
                  </li>
                ) : (
                  <li key={i}>
                    <ul>{g.itens.map((a) => item(a, false))}</ul>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      </div>
      <p className="text-base text-tinta-suave">
        {arquivos.length === 1 ? "1 arquivo" : `${arquivos.length} arquivos`}
        {novosNaFase ? ". • novo ou alterado nesta fase" : ""}
      </p>
    </section>
  );
}
