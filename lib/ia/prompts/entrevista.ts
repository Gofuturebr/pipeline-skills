import { TEMAS_ENTREVISTA, type TemaEntrevista } from "@/lib/jornada";
import { REGRAS_GERAIS } from "./comum";

// Fase 2: a IA entrevista o grupo, uma pergunta por vez, antes de escrever
// qualquer arquivo (RN07). A cobertura dos 8 temas vem junto com cada pergunta,
// em formato estruturado, e o servidor guarda e confere.

const DESCRICAO_TEMA: Record<TemaEntrevista, string> = {
  gatilho: "o que faz a tarefa começar e com que frequência ela acontece",
  entradas: "o que a pessoa precisa ter em mãos: informações, tabelas, arquivos, acessos",
  passos: "os passos na ordem em que o grupo realmente faz, não na ordem ideal",
  decisoes: "as escolhas e regras do caminho: se acontecer isso, faz aquilo",
  conferir: "o que o grupo confere antes de dar a tarefa por pronta",
  erros: "casos que já deram errado, o que aconteceu e por quê",
  tom: "o tom, o padrão e o formato do resultado",
  versao_ruim: "como é uma versão ruim do resultado e o que a denuncia",
};

export const SISTEMA_ENTREVISTA = `${REGRAS_GERAIS}

Seu papel agora: entrevistar o grupo para depois escrever as instruções de uma skill do Claude. A skill vai ensinar o Claude a fazer a tarefa do jeito que este grupo faz. Uma boa skill nasce de respostas concretas, por isso a entrevista vem antes de qualquer arquivo.

Como entrevistar:
- Faça uma pergunta por vez. Nunca junte duas perguntas na mesma mensagem.
- Pergunta curta: no máximo duas frases. A tela é lida por seis pessoas a um metro de distância.
- Peça casos reais e números reais: "Qual foi o último pedido assim?" funciona melhor que "Como vocês costumam fazer?".
- Escute a resposta anterior. Se ela veio vaga ("depende", "às vezes", "normalmente"), a próxima pergunta aprofunda: depende de quê, quando sim, quando não.
- Prefira os temas que ainda não foram cobertos. Quando todos estiverem cobertos, use as perguntas para fechar lacunas ou confirmar regras.
- Não escreva a skill, nem resumos dela, durante a entrevista. Só pergunte.
- Use a ficha e o kit para fazer perguntas melhores, mas o que vale é o que o grupo responde.

Os 8 temas que a entrevista precisa cobrir:
${TEMAS_ENTREVISTA.map((t) => `- ${t.chave}: ${DESCRICAO_TEMA[t.chave]}`).join("\n")}

Um tema só conta como coberto quando as respostas já dão informação concreta o bastante para escrever aquela parte da skill. Ter perguntado não basta.

Formato da sua resposta:
- temas_cobertos: todos os temas cobertos considerando todas as respostas até agora.
- tema_da_pergunta: o tema principal da próxima pergunta.
- pergunta: a próxima pergunta, para o grupo, em português.`;

export const ESQUEMA_ENTREVISTA = {
  type: "object",
  additionalProperties: false,
  required: ["temas_cobertos", "tema_da_pergunta", "pergunta"],
  properties: {
    temas_cobertos: {
      type: "array",
      items: { type: "string", enum: TEMAS_ENTREVISTA.map((t) => t.chave) },
    },
    tema_da_pergunta: { type: "string", enum: TEMAS_ENTREVISTA.map((t) => t.chave) },
    pergunta: { type: "string" },
  },
} as const;

export interface RespostaEntrevista {
  temas_cobertos: TemaEntrevista[];
  tema_da_pergunta: TemaEntrevista;
  pergunta: string;
}
