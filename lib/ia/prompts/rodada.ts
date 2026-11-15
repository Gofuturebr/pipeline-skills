import { REGRAS_GERAIS } from "./comum";

// Fases 3 a 6: o Claude usa a skill da pasta para fazer a tarefa (rodada), e
// confere o resultado contra as conferências da seção Pronto quando (placar).

const USAR_A_SKILL = `Você é o Claude e recebeu uma skill: uma pasta com as instruções (SKILL.md), modelos (arquivos/) e exemplos aprovados (exemplos/). Faça a tarefa do caso seguindo a skill.

Como usar a skill:
- Siga os passos e as decisões do SKILL.md.
- Use os modelos da pasta sempre que servirem: copie a estrutura e preencha as lacunas entre colchetes.
- Use os exemplos como referência de tom e de formato.
- Use os materiais do caso (tabelas, listas, prazos) como fonte dos números. Não invente dado que não está no caso nem nos materiais. Se faltar, diga no resultado o que falta.
- O resultado é o que a tarefa entrega, pronto para usar. Por exemplo, a mensagem que vai para o cliente, sem comentários antes ou depois.`;

export const SISTEMA_RODADA = `${REGRAS_GERAIS}

${USAR_A_SKILL}

Formato da sua resposta:
- resultado: o que a tarefa entrega, pronto para usar.
- reusou: cada arquivo da pasta que você usou, com uma frase dizendo para quê.
- refez: cada parte do resultado que você criou do zero porque a pasta não tinha modelo nem exemplo para ela.`;

export const ESQUEMA_RODADA = {
  type: "object",
  additionalProperties: false,
  required: ["resultado", "reusou", "refez"],
  properties: {
    resultado: { type: "string" },
    reusou: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["arquivo", "para_que"],
        properties: { arquivo: { type: "string" }, para_que: { type: "string" } },
      },
    },
    refez: { type: "array", items: { type: "string" } },
  },
} as const;

export interface RespostaRodada {
  resultado: string;
  reusou: { arquivo: string; para_que: string }[];
  refez: string[];
}

export function sistemaPlacar(consertar: boolean): string {
  const conserto = consertar
    ? "Se uma conferência falhar, conserte o resultado e confira de novo. O resultado final é o já consertado."
    : "Não conserte o resultado: o objetivo é testar a skill como ela está. Só confira e informe.";
  return `${REGRAS_GERAIS}

${USAR_A_SKILL}

Depois de fazer a tarefa, confira o resultado contra cada conferência da lista, usando a fonte que ela indica: os materiais do caso, o próprio caso, uma contagem ou o próprio texto do resultado. ${conserto}

Para cada conferência, informe:
- numero: o número da conferência na lista.
- passou: verdadeiro se o resultado atende, falso se não atende.
- prova: o que você comparou, com o valor ou o trecho e a fonte. Exemplo: "Total R$ 1.500,00 = 20 x 45,00 + 5 x 120,00 (tabela de preços)".
- conseguiu_conferir: falso quando a fonte indicada não está disponível para você, por exemplo uma planilha que não veio no caso. Nesse caso, passou é falso e a prova explica o que faltou.`;
}

export const ESQUEMA_PLACAR = {
  type: "object",
  additionalProperties: false,
  required: ["resultado", "conferencias"],
  properties: {
    resultado: { type: "string" },
    conferencias: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["numero", "passou", "prova", "conseguiu_conferir"],
        properties: {
          numero: { type: "integer" },
          passou: { type: "boolean" },
          prova: { type: "string" },
          conseguiu_conferir: { type: "boolean" },
        },
      },
    },
  },
} as const;

export interface RespostaPlacar {
  resultado: string;
  conferencias: { numero: number; passou: boolean; prova: string; conseguiu_conferir: boolean }[];
}

export const SISTEMA_CONGELAR = `${REGRAS_GERAIS}

Seu papel agora: transformar um trecho de um resultado que o grupo aprovou num modelo reutilizável, para a caixa de ferramentas da skill.

Regras:
- Troque tudo o que é específico deste caso (nomes, valores, datas, quantidades, endereços, produtos) por lacunas entre colchetes que digam o que vai ali. Exemplo: [nome do cliente], [valor total].
- Mantenha o resto igual: a ordem, o tom e as frases fixas.
- O modelo precisa ter pelo menos uma lacuna.
- nome_arquivo: curto, em minúsculas, com hífens, começando com "modelo-" e terminando em ".md". Exemplo: modelo-mensagem-orcamento.md.
- pra_que_serve: uma frase dizendo quando usar o modelo.
- conteudo: o modelo, pronto para ser preenchido.`;

export const ESQUEMA_CONGELAR = {
  type: "object",
  additionalProperties: false,
  required: ["nome_arquivo", "pra_que_serve", "conteudo"],
  properties: {
    nome_arquivo: { type: "string" },
    pra_que_serve: { type: "string" },
    conteudo: { type: "string" },
  },
} as const;

export interface RespostaCongelar {
  nome_arquivo: string;
  pra_que_serve: string;
  conteudo: string;
}

/** A pasta da skill como texto, para a IA ler. A conversa da entrevista nunca entra (RN09). */
export function pastaComoTexto(arquivos: { caminho: string; conteudo: string }[]): string {
  return arquivos.map((a) => `<arquivo caminho="${a.caminho}">\n${a.conteudo}\n</arquivo>`).join("\n\n");
}
