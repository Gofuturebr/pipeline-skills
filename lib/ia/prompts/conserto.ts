import { REGRAS_GERAIS } from "./comum";

// Fase 6: todo erro é corrigido na pasta, na camada que falhou. A IA propõe o
// menor conserto duradouro; a mesa aprova. Com mais de duas falhas, a IA aponta
// antes a parte do passo a passo que causou as falhas (RN12).

export const CAMADAS = {
  processo: "Processo: faltou um passo, uma regra ou uma decisão no SKILL.md",
  caixa: "Caixa: um modelo da pasta está errado, ou faltou um modelo e a IA refez do zero",
  prova: "Prova: faltou uma conferência na seção Pronto quando",
} as const;

export type Camada = keyof typeof CAMADAS;

export const SISTEMA_CONSERTO = `${REGRAS_GERAIS}

Seu papel agora: propor o menor conserto duradouro na pasta da skill, na camada que o grupo marcou. A pasta recebeu um teste de outra mesa e uma conferência falhou.

As camadas:
- ${CAMADAS.processo}.
- ${CAMADAS.caixa}.
- ${CAMADAS.prova}.

Regras do conserto:
- Mude só o necessário. Não reescreva o que funciona.
- O conserto vale para os próximos casos, não só para este. Nada de remendo para um cliente específico.
- Camada processo: o arquivo é o SKILL.md. Devolva o conteúdo completo do SKILL.md já consertado, com as mesmas 7 seções.
- Camada caixa: o arquivo é um modelo em arquivos/, novo ou existente, com lacunas entre colchetes. Devolva o caminho e o conteúdo completo do modelo.
- Camada prova: não mexa em arquivo. Proponha uma conferência nova, com o que confere e contra qual fonte, sem palavras vagas como "claro", "profissional" ou "de qualidade".
- Se mais de duas conferências falharam no teste, comece pelo diagnóstico: qual parte do passo a passo causou as falhas. Com até duas falhas, deixe o diagnóstico vazio.

Formato da sua resposta:
- diagnostico: a parte do passo a passo que causou as falhas, ou vazio.
- o_que_deu_errado: uma frase.
- o_que_muda: uma ou duas frases dizendo o que o conserto muda.
- arquivo: o caminho do arquivo que muda (SKILL.md ou arquivos/modelo-nome.md). Na camada prova, SKILL.md.
- conteudo_novo: o conteúdo completo do arquivo depois do conserto. Na camada prova, vazio.
- nova_conferencia: na camada prova, a conferência nova. Nas outras camadas, os dois campos vazios.`;

export const ESQUEMA_CONSERTO = {
  type: "object",
  additionalProperties: false,
  required: ["diagnostico", "o_que_deu_errado", "o_que_muda", "arquivo", "conteudo_novo", "nova_conferencia"],
  properties: {
    diagnostico: { type: "string" },
    o_que_deu_errado: { type: "string" },
    o_que_muda: { type: "string" },
    arquivo: { type: "string" },
    conteudo_novo: { type: "string" },
    nova_conferencia: {
      type: "object",
      additionalProperties: false,
      required: ["descricao", "fonte"],
      properties: { descricao: { type: "string" }, fonte: { type: "string" } },
    },
  },
} as const;

export interface RespostaConserto {
  diagnostico: string;
  o_que_deu_errado: string;
  o_que_muda: string;
  arquivo: string;
  conteudo_novo: string;
  nova_conferencia: { descricao: string; fonte: string };
}
