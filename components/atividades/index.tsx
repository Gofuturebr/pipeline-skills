"use client";

import type { ComponentType } from "react";
import { MARCO_DA_ATIVIDADE, type TipoAtividade } from "@/lib/jornada";
import type { EstadoMesaApi, PassoApi } from "@/lib/tipos-api";

// Registro de atividades: o centro da tela da mesa renderiza o componente do
// tipo de atividade do passo (docs/frontend.md, seção 3). Trocar o roteiro não
// exige mexer em componente.

export interface PropsAtividade {
  passo: PassoApi;
  estado: EstadoMesaApi;
  codigo: string;
  somenteLeitura: boolean;
}

/** Atividade ainda não construída. Cada marco troca a sua entrada abaixo. */
function EmConstrucao({ passo }: PropsAtividade) {
  return (
    <div className="rounded-folha border-2 border-dashed border-linha bg-bancada px-6 py-5 text-xl leading-normal text-tinta-suave">
      Esta atividade ainda está em construção e chega no Marco {MARCO_DA_ATIVIDADE[passo.tipo]}. Por
      enquanto, façam o passo conversando entre vocês e marquem como concluído.
    </div>
  );
}

const ATIVIDADES: Record<TipoAtividade, ComponentType<PropsAtividade>> = {
  papeis: EmConstrucao,
  leitura: EmConstrucao,
  frase: EmConstrucao,
  entrevista: EmConstrucao,
  editor: EmConstrucao,
  rodada: EmConstrucao,
  caixa: EmConstrucao,
  conferencias: EmConstrucao,
  placar: EmConstrucao,
  relatorio: EmConstrucao,
  conserto: EmConstrucao,
};

export function AtividadeDoPasso(props: PropsAtividade) {
  const Componente = ATIVIDADES[props.passo.tipo];
  return <Componente {...props} />;
}
