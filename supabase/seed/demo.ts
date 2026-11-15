// Evento de demonstração: 1 evento, 1 processo (comunicação de um evento) e 3 mesas.
// Todos os dados são fictícios (seção 8: kits com dados fictícios ou anonimizados).
// As datas do kit ficam em março de 2027, depois da oficina, para que as regras de
// prazo do convite possam ser cumpridas e conferidas.

export const EVENTO_DEMO = {
  nome: "Oficina de Criação de Skills InovaPB",
  data: "2026-12-03",
};

export const PROCESSOS_DEMO = [
  {
    chave: "comunicacao",
    nome: "Planejar um evento e a comunicação para engajar o público",
    ficha: {
      objetivo:
        "Escolher, a partir de uma pesquisa, o tema certo para o público do grupo e planejar o evento completo, da ideia à divulgação, para lotar o local.",
      quemExecuta: "Equipe de comunicação de uma associação, coletivo ou rede de empreendedores",
      frequencia: "De 2 a 4 eventos por ano. Cada plano leva cerca de 1 semana de trabalho",
      entradas:
        "Pesquisa de temas, perfil e canais do grupo, orçamento, lista de locais e lista de possíveis convidados",
      resultadoEsperado:
        "Plano do evento com tema e justificativa, ideia, data e local, agenda com horários, convidados, texto do convite e calendário de divulgação com meta de inscritos",
    },
    kitMateriais: [
      "1. Pesquisa de temas (fictícia)",
      "Enquete com 120 empreendedores de Campina Grande, outubro de 2026. Cada pessoa marcou até 2 temas como prioridade.",
      "- Vendas pelo Instagram e pelo WhatsApp: 64%. Mais pedido por comércio e alimentação.",
      "- Gestão do dinheiro do negócio: 52%. Pedido por todos os setores.",
      "- Inteligência artificial no dia a dia do negócio: 47%. Mais pedido por comércio e serviços.",
      "- Atendimento que fideliza o cliente: 38%. Mais pedido por beleza e alimentação.",
      "- Vender para fora do estado: 12%. Mais pedido por indústria e artesanato.",
      "",
      "2. Locais livres em março de 2027 (um turno = manhã, das 8h às 12h, ou tarde, das 14h às 18h)",
      "- Auditório do Centro de Inovação Açude Velho: até 120 pessoas. Sem custo para grupos parceiros. Livre em 10/03 (quarta), 17/03 (quarta) e 24/03 (quarta). Tem projetor e som.",
      "- Coworking Borborema: até 40 pessoas. R$ 600,00 por turno, com café. Livre em 09/03 (terça) e 16/03 (terça).",
      "- Salão da Associação dos Lojistas do Centro: até 80 pessoas. R$ 900,00 por turno. Livre em 11/03 (quinta) e 18/03 (quinta). Tem estacionamento.",
      "",
      "3. Possíveis convidados para falar no evento",
      "- Marina Albuquerque: vendas pelo Instagram e pelo WhatsApp. Pode em 10/03 e 11/03. Sem cachê.",
      "- Rafael Torres: inteligência artificial para pequenos negócios. Pode em 17/03 e 18/03. Cachê de R$ 500,00.",
      "- Joana Freitas: gestão do dinheiro do negócio. Pode em 09/03 e 16/03. Sem cachê.",
      "- Tiago Moura: atendimento que fideliza o cliente. Pode em 10/03 e 24/03. Cachê de R$ 300,00.",
      "- Lúcia Ramos: dona da Doceria Flor de Sal, conta como dobrou as encomendas pelo WhatsApp. Pode em qualquer data. Sem cachê.",
      "",
      "4. Regras de comunicação dos grupos",
      "- O convite sai pelo menos 15 dias antes do evento.",
      "- A inscrição é pelo link do formulário e fecha 2 dias antes do evento.",
      "- Lembretes: 7 dias antes, 1 dia antes e no dia, de manhã.",
      "- Meta de inscritos: 120% dos lugares, porque cerca de 1 em cada 5 inscritos falta.",
      "- Melhores horários: Instagram na terça e na quinta, às 19h. WhatsApp na segunda, às 9h. E-mail na quarta, às 10h.",
    ].join("\n"),
    exemploBom: [
      "Plano do evento: IA na Loja",
      "Grupo: lojistas do Centro. Público: 70 lojistas. Orçamento: R$ 1.500,00.",
      "",
      "Tema: Inteligência artificial no dia a dia do negócio. Teve 47% na pesquisa e é um dos mais pedidos pelo comércio. Vendas pelo Instagram teve mais votos, mas o grupo já fez esse evento no ano passado.",
      "Ideia: manhã com palestra curta, roda de conversa e oficina no celular. Cada lojista sai com 3 usos da IA testados na própria loja.",
      "Data e local: 18/03 (quinta), das 8h às 11h, no Salão da Associação dos Lojistas do Centro (80 lugares, R$ 900,00).",
      "Convidados: Rafael Torres, palestra sobre IA para pequenos negócios (R$ 500,00). Custo total: R$ 1.400,00.",
      "",
      "Agenda:",
      "8h00 Café e credenciamento (30 min)",
      "8h30 Abertura (10 min)",
      "8h40 Palestra: IA no dia a dia da loja, com Rafael Torres (40 min)",
      "9h20 Roda de conversa com 3 lojistas do grupo (30 min)",
      "9h50 Oficina: cada loja testa 3 usos da IA no celular (50 min)",
      "10h40 Perguntas e encerramento (20 min)",
      "",
      "Convite:",
      "Lojista do Centro, a inteligência artificial já cabe no seu celular. Venha para o IA na Loja, quinta, 18/03, das 8h às 11h, no Salão da Associação dos Lojistas. Palestra com Rafael Torres e oficina prática. Gratuito, com café. São 80 lugares: inscreva-se até 16/03 pelo link [link do formulário].",
      "",
      "Divulgação (meta: 96 inscritos, 120% de 80 lugares):",
      "- 01/03 (segunda), 9h: convite no grupo de WhatsApp.",
      "- 02/03 (terça), 19h: convite no Instagram.",
      "- 03/03 (quarta), 10h: convite por e-mail.",
      "- 11/03 (quinta), 19h: lembrete de 7 dias no Instagram e no WhatsApp.",
      "- 16/03 (terça): inscrições fecham.",
      "- 17/03 (quarta): lembrete de 1 dia no WhatsApp.",
      "- 18/03 (quinta), 7h: lembrete do dia no WhatsApp.",
    ].join("\n"),
    exemploRuim: [
      "Evento de inovação",
      "Vamos fazer um evento bem legal sobre as tendências do mercado, com palestrantes de peso. Local e data a definir.",
      "Convite: Venha para o nosso evento incrível! Não perca!",
      "Divulgação: postar nas redes sociais.",
    ].join("\n"),
    casoExemplo:
      "Rede de Confeiteiras de Campina Grande: 45 associadas, quase todas vendem por encomenda pelo WhatsApp e pelo Instagram. Querem um evento em março de 2027 para as associadas e outras confeiteiras da cidade, com até 60 pessoas. Preferem de manhã. Orçamento: R$ 1.000,00. Canais do grupo: Instagram com 2.300 seguidores, grupo de WhatsApp com 180 pessoas e lista de e-mails com 650 contatos.",
    casoNovo:
      "Coletivo de Salões do Catolé: 25 salões de beleza do bairro. Querem um evento em março de 2027 para donos e equipes dos salões, com até 35 pessoas. Não querem pagar pelo local. Orçamento: R$ 400,00. Canais do grupo: Instagram com 900 seguidores e grupo de WhatsApp com 60 pessoas. Não têm lista de e-mails.",
  },
];

export const MESAS_DEMO = [
  { numero: 1, nome: "Mesa 01", codigo: "K7PX2M", processo: "comunicacao" },
  { numero: 2, nome: "Mesa 02", codigo: "R4TW9H", processo: "comunicacao" },
  { numero: 3, nome: "Mesa 03", codigo: "B8NC3F", processo: "comunicacao" },
];
