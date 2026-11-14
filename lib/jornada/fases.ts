import type { DefinicaoFase } from "./tipos";

// Roteiro padrão da jornada, derivado da seção 3 da especificação.
// Estes textos são copiados para o banco no seed e passam a ser editáveis pelo
// admin. O código nunca lê a instrução daqui durante o evento: lê do banco.
//
// Regras de texto: português do Brasil, verbo no início, "vocês" para a mesa,
// sem travessões, sem caixa alta e sem jargão.

export const DURACAO_INTERVALO_MIN = 10;

/** Fase depois da qual acontece o intervalo. */
export const INTERVALO_DEPOIS_DA_FASE = 3;

export const FASES: DefinicaoFase[] = [
  {
    ordem: 0,
    chave: "checkin",
    nome: "Check-in e papéis",
    nomeCurto: "Check-in",
    duracaoMin: 10,
    entrega: "Mesa formada",
    criterio: "papeis_completos",
    criterioTexto: "Todos os papéis têm um nome",
    aprofundamento:
      "Combinem como o Porta-voz vai avisar o tempo: em que momento ele fala e o que diz.",
    passos: [
      {
        chave: "checkin",
        instrucao: "Cada pessoa lê o QR da mesa com o celular e digita o primeiro nome.",
        papel: "porta_voz",
        tipo: "papeis",
        criterio: "livre",
        config: { variante: "checkin" },
      },
      {
        chave: "distribuir",
        instrucao: "Escolham quem fica com cada papel. Leiam em voz alta o que cada um faz.",
        papel: "mesa",
        tipo: "papeis",
        criterio: "papeis_completos",
        config: { variante: "distribuir" },
      },
      {
        chave: "confirmar",
        instrucao: "Porta-voz, confira se cada papel tem um nome e confirme a formação da mesa.",
        papel: "porta_voz",
        tipo: "papeis",
        criterio: "livre",
        config: { variante: "confirmar" },
      },
    ],
  },
  {
    ordem: 1,
    chave: "processo",
    nome: "Entender o processo",
    nomeCurto: "Processo",
    duracaoMin: 15,
    entrega: "Tarefa em uma linha",
    criterio: "ficha_lida_e_tarefa",
    criterioTexto: "Ficha lida e frase da tarefa confirmada",
    aprofundamento: "Escrevam em uma frase o que acontece quando essa tarefa é mal feita.",
    rotuloContribuicao: "Uma dúvida ou um caso parecido que você já viveu",
    passos: [
      {
        chave: "ficha",
        instrucao:
          "Leiam a ficha do processo: objetivo, quem executa, frequência, entradas e resultado esperado.",
        papel: "dono",
        tipo: "leitura",
        criterio: "lido",
        config: { conteudo: "ficha" },
      },
      {
        chave: "kit",
        instrucao:
          "Leiam o kit. Comparem o exemplo bom com o exemplo ruim e digam em voz alta o que muda.",
        papel: "mesa",
        tipo: "leitura",
        criterio: "lido",
        config: { conteudo: "kit" },
      },
      {
        chave: "duvidas",
        instrucao: "Cada pessoa envia pelo celular uma dúvida ou um caso parecido que já viveu.",
        papel: "mesa",
        tipo: "leitura",
        criterio: "livre",
        config: { conteudo: "contribuicoes" },
      },
      {
        chave: "tarefa",
        instrucao: "Escrevam a tarefa em uma linha, com verbo e resultado.",
        papel: "dono",
        tipo: "frase",
        criterio: "tarefa_confirmada",
        config: {
          campo: "tarefa",
          limite: 90,
          exemplo: "Responder pedido de orçamento com preço e prazo em até 2 horas",
        },
      },
    ],
  },
  {
    ordem: 2,
    chave: "entrevista",
    nome: "Entrevista",
    nomeCurto: "Entrevista",
    duracaoMin: 35,
    entrega: "SKILL.md versão 1",
    criterio: "entrevista_e_skill_aprovada",
    criterioTexto: "8 temas cobertos e arquivo aprovado pela mesa",
    aprofundamento:
      "Contem mais um caso que já deu errado e acrescentem na seção Casos que já deram errado.",
    rotuloContribuicao: "Lembrou de uma exceção ou de algo que já deu errado?",
    passos: [
      {
        chave: "entrevista",
        instrucao:
          "Respondam às perguntas da IA, uma por vez. O Dono do processo responde em voz alta e o Piloto digita.",
        papel: "dono",
        tipo: "entrevista",
        criterio: "entrevista_completa",
      },
      {
        chave: "gerar",
        instrucao: "Peçam à IA para escrever o SKILL.md com o que vocês contaram.",
        papel: "piloto",
        tipo: "editor",
        criterio: "skill_gerada",
        config: { arquivo: "SKILL.md", acao: "gerar" },
      },
      {
        chave: "revisar",
        instrucao:
          "Respondam às duas perguntas da IA: o que ela errou e o que vocês esqueceram de contar. Corrijam direto no arquivo e aprovem.",
        papel: "mesa",
        tipo: "editor",
        criterio: "skill_aprovada",
        config: { arquivo: "SKILL.md", acao: "revisar" },
        permiteEditar: true,
      },
    ],
  },
  {
    ordem: 3,
    chave: "caixa",
    nome: "Caixa de ferramentas",
    nomeCurto: "Caixa",
    duracaoMin: 25,
    entrega: "arquivos, exemplos e INDICE.md",
    criterio: "modelo_e_exemplo",
    criterioTexto: "Pelo menos 1 modelo e 1 exemplo salvos",
    aprofundamento:
      "Olhem o que foi refeito na segunda rodada e escolham mais uma parte para congelar.",
    passos: [
      {
        chave: "rodar",
        instrucao: "Rodem a tarefa com o caso de exemplo do kit.",
        papel: "piloto",
        tipo: "rodada",
        criterio: "rodada_feita",
        config: { caso: "caso_exemplo", tipoRodada: "exemplo" },
      },
      {
        chave: "congelar",
        instrucao:
          "Guardião, congele cada parte do resultado que ficou boa. A IA troca o que é específico por lacunas e guarda na pasta.",
        papel: "guardiao",
        tipo: "caixa",
        criterio: "modelo_salvo",
        config: { acao: "congelar" },
      },
      {
        chave: "exemplo",
        instrucao: "Guardião, salve o resultado aprovado em exemplos.",
        papel: "guardiao",
        tipo: "caixa",
        criterio: "exemplo_salvo",
        config: { acao: "exemplo" },
      },
      {
        chave: "segunda",
        instrucao:
          "Rodem a tarefa de novo, do zero. Vejam o que a IA reusou e o que precisou refazer.",
        papel: "piloto",
        tipo: "rodada",
        criterio: "segunda_rodada_feita",
        config: { caso: "caso_exemplo", tipoRodada: "segunda" },
      },
    ],
  },
  {
    ordem: 4,
    chave: "prova",
    nome: "Prova",
    nomeCurto: "Prova",
    duracaoMin: 20,
    entrega: "Seção Pronto quando",
    criterio: "conferencias_validas",
    criterioTexto: "De 5 a 10 conferências válidas",
    aprofundamento: "Troquem uma conferência por outra mais fácil de contar ou comparar.",
    passos: [
      {
        chave: "escrever",
        instrucao:
          "Cético, escreva de 5 a 10 conferências. Cada uma diz o que confere e contra qual fonte.",
        papel: "cetico",
        tipo: "conferencias",
        criterio: "conferencias_validas",
      },
      {
        chave: "rodar",
        instrucao:
          "Rodem a tarefa. A IA confere cada item, conserta o que falhou e mostra o placar.",
        papel: "piloto",
        tipo: "placar",
        criterio: "placar_executado",
        config: { modo: "prova" },
      },
      {
        chave: "ajustar",
        instrucao:
          "Vejam o que a IA não conseguiu conferir e decidam se ajustam ou removem cada item.",
        papel: "cetico",
        tipo: "conferencias",
        criterio: "conferencias_validas",
        config: { modo: "ajuste" },
      },
    ],
  },
  {
    ordem: 5,
    chave: "teste",
    nome: "Teste cruzado",
    nomeCurto: "Teste",
    duracaoMin: 30,
    entrega: "Relatório de teste",
    criterio: "teste_cruzado_completo",
    criterioTexto: "Relatório enviado à parceira e relatório da parceira recebido",
    aprofundamento:
      "Escolham, no relatório recebido, a falha que mais atrapalharia quem usa a skill.",
    passos: [
      {
        chave: "rodar",
        instrucao:
          "Testador, rode a skill da mesa parceira com o caso novo do kit. Ninguém da outra mesa explica nada.",
        papel: "testador",
        tipo: "placar",
        criterio: "teste_rodado",
        config: { modo: "teste" },
      },
      {
        chave: "observar",
        instrucao: "Testador, escreva o que aconteceu em cada falha.",
        papel: "testador",
        tipo: "placar",
        criterio: "falhas_observadas",
        config: { modo: "observar" },
      },
      {
        chave: "enviar",
        instrucao: "Enviem o relatório para a mesa autora.",
        papel: "testador",
        tipo: "relatorio",
        criterio: "relatorio_enviado",
        config: { modo: "enviar" },
      },
      {
        chave: "receber",
        instrucao: "Leiam o relatório que a mesa parceira fez sobre a skill de vocês.",
        papel: "mesa",
        tipo: "relatorio",
        criterio: "relatorio_recebido",
        config: { modo: "receber" },
      },
    ],
  },
  {
    ordem: 6,
    chave: "conserto",
    nome: "Conserto",
    nomeCurto: "Conserto",
    duracaoMin: 20,
    entrega: "Skill versão 2 e notas.md",
    criterio: "conserto_e_nova_rodada",
    criterioTexto: "Pelo menos 1 conserto registrado e nova rodada feita",
    aprofundamento: "Escolham uma segunda falha e marquem a camada que falhou.",
    passos: [
      {
        chave: "escolher",
        instrucao: "Leiam o relatório e escolham a falha mais importante.",
        papel: "mesa",
        tipo: "relatorio",
        criterio: "falha_escolhida",
        config: { modo: "escolher" },
      },
      {
        chave: "camada",
        instrucao: "Marquem a camada que falhou: processo, caixa ou prova.",
        papel: "mesa",
        tipo: "conserto",
        criterio: "camada_escolhida",
        config: { etapa: "camada" },
      },
      {
        chave: "propor",
        instrucao: "Leiam a proposta da IA para o menor conserto que resolve e aprovem.",
        papel: "dono",
        tipo: "conserto",
        criterio: "conserto_aprovado",
        config: { etapa: "proposta" },
        permiteEditar: true,
      },
      {
        chave: "rodar",
        instrucao: "Rodem a tarefa de novo e comparem o antes e o depois.",
        papel: "piloto",
        tipo: "rodada",
        criterio: "rodada_conserto_feita",
        config: { caso: "caso_novo", tipoRodada: "conserto_depois" },
      },
    ],
  },
  {
    ordem: 7,
    chave: "entrega",
    nome: "Entrega",
    nomeCurto: "Entrega",
    duracaoMin: 15,
    entrega: "Pasta exportada",
    criterio: "skill_final",
    criterioTexto: "Skill marcada como final",
    aprofundamento: "Ensaiem a apresentação de 1 minuto mais uma vez, cronometrando.",
    passos: [
      {
        chave: "nome",
        instrucao: "Revisem o nome da skill. Usem palavras simples, que digam o que ela faz.",
        papel: "mesa",
        tipo: "frase",
        criterio: "nome_definido",
        config: { campo: "nome_skill", limite: 60, exemplo: "Orçamento pelo WhatsApp" },
      },
      {
        chave: "quando",
        instrucao:
          "Revisem a seção Quando usar com as palavras que alguém digitaria para pedir a tarefa.",
        papel: "mesa",
        tipo: "editor",
        criterio: "secao_revisada",
        config: { arquivo: "SKILL.md", secao: "Quando usar" },
        permiteEditar: true,
      },
      {
        chave: "final",
        instrucao: "Marquem a skill como final. Depois disso, ela não pode mais ser editada.",
        papel: "mesa",
        tipo: "editor",
        criterio: "skill_final",
        config: { acao: "final" },
      },
      {
        chave: "apresentar",
        instrucao:
          "Porta-voz, apresente em 1 minuto: o processo, uma conferência da prova e o conserto feito. Todos baixam a pasta pelo celular.",
        papel: "porta_voz",
        tipo: "leitura",
        criterio: "livre",
        config: { conteudo: "entrega" },
      },
    ],
  },
];

export const ULTIMA_FASE = FASES.length - 1;

export function definicaoDaFase(ordem: number): DefinicaoFase | undefined {
  return FASES.find((f) => f.ordem === ordem);
}
