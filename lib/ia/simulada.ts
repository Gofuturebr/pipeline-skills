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
    } else if (pedido.tarefa === "rodada") {
      const conteudo = JSON.stringify(pedido.mensagens);
      const temModelo = conteudo.includes("arquivos/modelo-");
      texto = JSON.stringify({
        resultado: "Olá, Bruno! Segue o orçamento:\n30 cadeiras: R$ 1.350,00\n6 mesas: R$ 720,00\n\nTotal: R$ 2.070,00. Entrega em 1 dia útil.\n\nPosso confirmar o pedido?",
        reusou: temModelo ? [{ arquivo: "arquivos/modelo-mensagem-orcamento.md", para_que: "estrutura da mensagem" }] : [],
        refez: temModelo ? ["cálculo do total"] : ["mensagem inteira", "cálculo do total"],
      });
    } else if (pedido.tarefa === "placar") {
      // Conferência com "falha" no texto falha; fonte com "planilha" não dá para conferir.
      const ultimo = pedido.mensagens[pedido.mensagens.length - 1];
      const corpo = typeof ultimo.content === "string" ? ultimo.content : "";
      const itens = corpo.split("Conferências:\n")[1]?.split("\n").filter((l) => /^\d+\. /.test(l)) ?? [];
      texto = JSON.stringify({
        resultado: "Olá, Carla! Segue o orçamento conferido.\n\nTotal: R$ 3.630,00.",
        conferencias: itens.map((l, i) => {
          const naoDa = /planilha/i.test(l);
          return {
            numero: i + 1,
            passou: !naoDa && !/falha/i.test(l),
            prova: naoDa ? "A planilha não veio no caso." : `Conferido: ${l.slice(3, 40)}`,
            conseguiu_conferir: !naoDa,
          };
        }),
      });
    } else if (pedido.tarefa === "conserto") {
      texto = JSON.stringify({
        diagnostico: "",
        o_que_deu_errado: "A mensagem não dizia o prazo de entrega.",
        o_que_muda: "O passo de escrever a mensagem passa a exigir o prazo do bairro.",
        arquivo: "SKILL.md",
        conteudo_novo: SKILL_SIMULADA.replace("## Passos\n- Item de passos.", "## Passos\n- Item de passos.\n- Escreva sempre o prazo do bairro."),
        nova_conferencia: { descricao: "", fonte: "" },
      });
    } else if (pedido.tarefa === "congelar") {
      texto = JSON.stringify({
        nome_arquivo: "modelo-mensagem-orcamento.md",
        pra_que_serve: "Responder um pedido de orçamento pelo WhatsApp.",
        conteudo: "Olá, [nome do cliente]! Segue o orçamento:\n[quantidade] [item]: [valor]\nTotal: [total]",
      });
    } else {
      texto = "{}";
    }
    emPedacos(texto, aoTexto);
    const r: ResultadoIA = { texto, parada: "fim", modelo: "simulada" };
    return r;
  };
  return { transmissor, pedidos, fila };
}
