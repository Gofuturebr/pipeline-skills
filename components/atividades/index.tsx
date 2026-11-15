"use client";

import type { ComponentType } from "react";
import { atividadePronta, marcoDaAtividade, type TipoAtividade } from "@/lib/jornada";
import { AtividadeCaixa } from "./Caixa";
import { AtividadeConferencias } from "./Conferencias";
import { AtividadeConserto } from "./Conserto";
import { AtividadeEditor } from "./Editor";
import { AtividadeEntrevista } from "./Entrevista";
import { AtividadeFrase } from "./Frase";
import { AtividadeLeitura } from "./Leitura";
import { AtividadePapeis } from "./Papeis";
import { AtividadePlacar } from "./Placar";
import { AtividadeRelatorio } from "./Relatorio";
import { AtividadeRodada } from "./Rodada";
import type { PropsAtividade } from "./tipos";

export type { PropsAtividade } from "./tipos";
export { FilaDeContribuicoes } from "./FilaDeContribuicoes";

// Registro de atividades: o centro da tela da mesa renderiza o componente do
// tipo de atividade do passo (docs/frontend.md, seção 3). Trocar o roteiro não
// exige mexer em componente.

/** Atividade ainda não construída. Cada marco troca a sua entrada abaixo. */
function EmConstrucao({ passo }: PropsAtividade) {
  return (
    <div className="rounded-folha border-2 border-dashed border-linha bg-bancada px-6 py-5 text-xl leading-normal text-tinta-suave">
      Esta atividade ainda está em construção e chega no Marco {marcoDaAtividade(passo)}. Por enquanto, façam o passo
      conversando entre vocês e marquem como concluído.
    </div>
  );
}

const ATIVIDADES: Partial<Record<TipoAtividade, ComponentType<PropsAtividade>>> = {
  papeis: AtividadePapeis,
  leitura: AtividadeLeitura,
  frase: AtividadeFrase,
  entrevista: AtividadeEntrevista,
  editor: AtividadeEditor,
  rodada: AtividadeRodada,
  caixa: AtividadeCaixa,
  conferencias: AtividadeConferencias,
  placar: AtividadePlacar,
  relatorio: AtividadeRelatorio,
  conserto: AtividadeConserto,
};

export function AtividadeDoPasso(props: PropsAtividade) {
  const Componente = atividadePronta(props.passo) ? (ATIVIDADES[props.passo.tipo] ?? EmConstrucao) : EmConstrucao;
  return <Componente {...props} />;
}
