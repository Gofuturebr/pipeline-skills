"use client";

import { Icone } from "@/components/base/Icone";
import { CronometroFase } from "@/components/base/Cronometro";
import type { EstadoMesaApi, FaseApi } from "@/lib/tipos-api";

// Trilha: as 8 fases em lista vertical. A fase atual abre com o cronômetro e
// os passos. Fase concluída abre em modo leitura. Fase bloqueada mostra cadeado.

export function Trilha({
  estado,
  defasagem,
  faseVista,
  aoVerFase,
  aoIrParaPasso,
  pedirAjuda,
}: {
  estado: EstadoMesaApi;
  defasagem: number;
  faseVista: number;
  aoVerFase: (ordem: number) => void;
  aoIrParaPasso: (ordem: number) => void;
  pedirAjuda: React.ReactNode;
}) {
  const { mesa } = estado;
  const primeiroAberto =
    estado.fases.find((f) => f.situacao === "atual")?.passos.find((p) => !p.concluido)?.ordem ?? Infinity;

  return (
    <nav aria-label="Trilha das fases" className="flex h-full flex-col">
      <ol className="flex-1 overflow-y-auto px-3 py-4">
        {estado.fases.map((f) => (
          <ItemFase
            key={f.ordem}
            fase={f}
            vista={faseVista === f.ordem}
            aoVerFase={aoVerFase}
          >
            {f.situacao === "atual" ? (
              <div className="flex flex-col gap-2 pb-3 pl-9 pr-1">
                <CronometroFase relogio={mesa.relogio} defasagem={defasagem} className="text-[32px] leading-none" />
                <ol className="flex flex-col gap-1">
                  {f.passos.map((p) => {
                    const atual = p.ordem === mesa.passoAtual && faseVista === f.ordem;
                    const liberado = p.ordem <= primeiroAberto;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          disabled={!liberado || mesa.estado === "pausada"}
                          onClick={() => aoIrParaPasso(p.ordem)}
                          aria-current={atual ? "step" : undefined}
                          className={`flex min-h-11 w-full items-center gap-2 rounded-folha px-2 text-left text-base ${
                            atual ? "bg-petroleo-claro font-bold" : ""
                          } disabled:cursor-default disabled:text-tinta-suave`}
                        >
                          <span
                            aria-hidden
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border-2 ${
                              p.concluido ? "border-petroleo bg-petroleo text-papel" : "border-tinta-suave"
                            }`}
                          >
                            {p.concluido ? <Icone nome="visto" className="h-3.5 w-3.5" /> : null}
                          </span>
                          <span>
                            Passo {p.ordem}
                            <span className="sr-only">{p.concluido ? ", concluído" : ", a fazer"}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}
          </ItemFase>
        ))}
      </ol>
      <div className="border-t-2 border-linha p-3">{pedirAjuda}</div>
    </nav>
  );
}

function ItemFase({
  fase,
  vista,
  aoVerFase,
  children,
}: {
  fase: FaseApi;
  vista: boolean;
  aoVerFase: (ordem: number) => void;
  children?: React.ReactNode;
}) {
  const icone =
    fase.situacao === "concluida" ? (
      <Icone nome="visto" className="h-5 w-5 text-estado-pronta" />
    ) : fase.situacao === "atual" ? (
      <Icone nome="andamento" className="h-5 w-5 text-petroleo" />
    ) : (
      <Icone nome="cadeado" className="h-5 w-5 text-tinta-suave" />
    );
  const rotuloSituacao =
    fase.situacao === "concluida" ? "concluída" : fase.situacao === "atual" ? "fase atual" : "bloqueada";
  const conteudo = (
    <>
      <span className="flex w-6 shrink-0 justify-center">{icone}</span>
      <span className="numeros-tabulares w-5 shrink-0 font-titulo font-bold">{fase.ordem}</span>
      <span className="truncate">{fase.nomeCurto}</span>
      <span className="sr-only">, {rotuloSituacao}</span>
    </>
  );
  const classe = `flex min-h-11 w-full items-center gap-2 rounded-folha px-1 text-left text-lg ${
    fase.situacao === "atual" ? "font-bold text-tinta" : ""
  } ${fase.situacao === "bloqueada" ? "text-tinta-suave" : ""} ${vista && fase.situacao !== "atual" ? "bg-petroleo-claro" : ""}`;

  return (
    <li className="flex flex-col">
      {fase.situacao === "bloqueada" ? (
        <div className={classe} aria-disabled>
          {conteudo}
        </div>
      ) : (
        <button type="button" className={classe} onClick={() => aoVerFase(fase.ordem)} aria-current={fase.situacao === "atual" ? "step" : undefined}>
          {conteudo}
        </button>
      )}
      {children}
    </li>
  );
}
