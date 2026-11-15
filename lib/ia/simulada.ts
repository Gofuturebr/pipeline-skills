import type { PedidoIA, ResultadoIA, TransmissorIA } from "@/lib/ia/cliente";
import { TEMAS_ENTREVISTA } from "@/lib/jornada";
import { SECOES_SKILL } from "@/lib/ia/prompts/skill";

// IA simulada: responde no formato que cada tarefa pede, em pedaços, sem chamar
// a API. Usada nos testes automáticos e, com IA_SIMULADA=1, nos testes de
// navegador. Nunca é usada no evento: sem IA_SIMULADA, vale a IA de verdade.

export interface IaSimulada {
  transmissor: TransmissorIA;
  pedidos: PedidoIA[];
  /** Respostas fixas por tarefa, usadas antes da resposta padrão. */
  fila: Record<string, string[]>;
}

function emPedacos(texto: string, aoTexto: (d: string) => void) {
  for (let i = 0; i < texto.length; i += 7) aoTexto(texto.slice(i, i + 7));
}

export const SKILL_SIMULADA = `# Orçamento pelo WhatsApp

${SECOES_SKILL.map((s) => `## ${s}\n- Item de ${s.toLowerCase()}.`).join("\n\n")}
`;

export function criarIaSimulada(): IaSimulada {
  const pedidos: PedidoIA[] = [];
  const fila: Record<string, string[]> = {};
  const transmissor: TransmissorIA = async (pedido, aoTexto) => {
    pedidos.push(pedido);
    const fixa = fila[pedido.tarefa]?.shift();
    let texto: string;
    if (fixa !== undefined) texto = fixa;
    else if (pedido.tarefa === "entrevista") {
      // A cada resposta do grupo, mais um tema fica coberto.
      const respostas = pedido.mensagens.filter(
        (m) => m.role === "user" && typeof m.content === "string" && m.content.startsWith("Resposta do grupo"),
      ).length;
      const cobertos = TEMAS_ENTREVISTA.slice(0, respostas).map((t) => t.chave);
      const proximo = TEMAS_ENTREVISTA[Math.min(respostas, TEMAS_ENTREVISTA.length - 1)].chave;
      texto = JSON.stringify({
        temas_cobertos: cobertos,
        tema_da_pergunta: proximo,
        pergunta: `Pergunta ${respostas + 1}: como vocês fazem "isso" hoje?`,
      });
    } else if (pedido.tarefa === "skill") {
      texto = SKILL_SIMULADA;
    } else {
      texto = "{}";
    }
    emPedacos(texto, aoTexto);
    const r: ResultadoIA = { texto, parada: "fim", modelo: "simulada" };
    return r;
  };
  return { transmissor, pedidos, fila };
}
