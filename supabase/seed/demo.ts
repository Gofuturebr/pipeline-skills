// Evento de demonstração: 1 evento, 2 processos e 3 mesas.
// Todos os dados são fictícios (seção 8: kits com dados fictícios ou anonimizados).

export const EVENTO_DEMO = {
  nome: "Oficina de Criação de Skills InovaPB",
  data: "2026-12-03",
};

export const PROCESSOS_DEMO = [
  {
    chave: "orcamento",
    nome: "Responder pedido de orçamento pelo WhatsApp",
    ficha: {
      objetivo: "Responder o cliente com um orçamento claro, que ele consiga aprovar sem voltar a perguntar.",
      quemExecuta: "Atendente comercial da loja",
      frequencia: "De 10 a 30 pedidos por dia",
      entradas: "Mensagem do cliente, tabela de preços, prazos de entrega por bairro",
      resultadoEsperado: "Mensagem com itens, quantidades, preço total, prazo de entrega e validade do orçamento",
    },
    kitMateriais: [
      "Tabela de preços (fictícia):",
      "Cadeira plástica branca: R$ 45,00",
      "Mesa plástica quadrada: R$ 120,00",
      "Toalha de mesa: R$ 18,00",
      "Entrega no Centro: 1 dia útil. Bairros vizinhos: 2 dias úteis.",
      "Orçamento vale por 7 dias.",
    ].join("\n"),
    exemploBom: [
      "Olá, Ana! Segue o orçamento:",
      "20 cadeiras plásticas brancas: R$ 900,00",
      "5 mesas quadradas: R$ 600,00",
      "Total: R$ 1.500,00",
      "Entrega no Catolé em 2 dias úteis.",
      "Este orçamento vale até 10/12. Posso confirmar o pedido?",
    ].join("\n"),
    exemploRuim: "Oi, fica uns 1500 mais ou menos, depois a gente vê a entrega.",
    casoExemplo:
      "Cliente Bruno, bairro Centro: quero 30 cadeiras e 6 mesas para uma festa no sábado. Quanto fica?",
    casoNovo:
      "Cliente Carla, bairro Bodocongó: preciso de 50 cadeiras, 10 mesas e 10 toalhas. Vocês entregam até quinta?",
  },
  {
    chave: "cobranca",
    nome: "Cobrar cliente com pagamento atrasado",
    ficha: {
      objetivo: "Lembrar o cliente do pagamento atrasado sem perder o cliente.",
      quemExecuta: "Responsável financeiro",
      frequencia: "Toda segunda-feira, de 5 a 15 clientes",
      entradas: "Lista de boletos vencidos, histórico do cliente, opções de parcelamento",
      resultadoEsperado: "Mensagem com valor, vencimento original, forma de pagamento e prazo para resposta",
    },
    kitMateriais: [
      "Lista de boletos vencidos (fictícia):",
      "Padaria Sol: R$ 380,00, venceu em 05/11, 1 atraso anterior",
      "Mercadinho Lua: R$ 1.240,00, venceu em 28/10, nenhum atraso anterior",
      "Parcelamento: até 3 vezes para valores acima de R$ 1.000,00.",
    ].join("\n"),
    exemploBom: [
      "Bom dia, equipe da Padaria Sol!",
      "Notamos que o boleto de R$ 380,00, com vencimento em 05/11, ainda está em aberto.",
      "Vocês podem pagar pelo mesmo boleto atualizado ou por Pix.",
      "Conseguem nos dar um retorno até sexta-feira?",
    ].join("\n"),
    exemploRuim: "Vocês estão devendo. Paguem logo senão vamos tomar providências.",
    casoExemplo: "Mercadinho Lua, R$ 1.240,00, venceu em 28/10, cliente há 3 anos, nunca atrasou.",
    casoNovo: "Oficina Estrela, R$ 2.100,00, venceu em 01/11, já pediu parcelamento uma vez neste ano.",
  },
];

export const MESAS_DEMO = [
  { numero: 1, nome: "Mesa 01", codigo: "K7PX2M", processo: "orcamento" },
  { numero: 2, nome: "Mesa 02", codigo: "R4TW9H", processo: "cobranca" },
  { numero: 3, nome: "Mesa 03", codigo: "B8NC3F", processo: "orcamento" },
];
