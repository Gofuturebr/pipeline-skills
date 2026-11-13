import type { Papel, PapelDoPasso } from "./tipos";

export interface DefinicaoPapel {
  papel: Papel;
  nome: string;
  descricao: string;
}

// Seção 2 da especificação.
export const DEFINICAO_PAPEIS: DefinicaoPapel[] = [
  {
    papel: "dono",
    nome: "Dono do processo",
    descricao:
      "Responde a entrevista da IA com base na ficha do processo e na experiência do grupo.",
  },
  { papel: "piloto", nome: "Piloto", descricao: "Opera a tela compartilhada." },
  {
    papel: "guardiao",
    nome: "Guardião da pasta",
    descricao: "Decide o que é salvo em arquivos e exemplos e confere o índice.",
  },
  {
    papel: "cetico",
    nome: "Cético",
    descricao: "Escreve as conferências da prova e descreve a versão ruim.",
  },
  {
    papel: "testador",
    nome: "Testador",
    descricao: "Roda a skill da mesa parceira no teste cruzado e registra o resultado.",
  },
  {
    papel: "porta_voz",
    nome: "Porta-voz",
    descricao:
      "Acompanha o tempo, pede ajuda quando precisa e apresenta na entrega. Em mesas de 5 pessoas, o Piloto acumula este papel.",
  },
];

export function nomeDoPapel(papel: PapelDoPasso): string {
  if (papel === "mesa") return "Toda a mesa";
  return DEFINICAO_PAPEIS.find((p) => p.papel === papel)?.nome ?? papel;
}
