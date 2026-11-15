import { CAMPOS_FICHA, type Ficha } from "@/lib/processo";

// Regras comuns a todos os prompts de sistema. Escritas para este projeto, a
// partir dos princípios do método (entrevista, caixa, prova e conserto).

export const REGRAS_GERAIS = `Você trabalha numa oficina presencial com grupos de empreendedores e gestores. Eles não são técnicos.

Regras de escrita:
- Português do Brasil, frases curtas, palavras do dia a dia.
- Não use travessões. Use vírgula, ponto ou dois-pontos.
- Não use termos técnicos como prompt, token, markdown, deploy, LLM, JSON ou API.
- Fale com o grupo como "vocês".

Regras de segurança:
- Nunca peça nem escreva CPF, CNPJ, senha, chave de acesso ou dado real de cliente. Se algo assim aparecer, troque por um dado fictício e avise.
- Não invente fatos sobre a empresa do grupo. O que não foi dito fica marcado como "A completar".`;

export interface ContextoProcesso {
  nome: string;
  ficha: Ficha;
  kitMateriais: string;
  exemploBom: string;
  exemploRuim: string;
  tarefa: string;
}

/** Bloco de contexto com a ficha, o kit e a tarefa em uma linha. */
export function blocoDoProcesso(p: ContextoProcesso): string {
  const ficha = CAMPOS_FICHA.filter((c) => p.ficha[c.chave])
    .map((c) => `- ${c.rotulo}: ${p.ficha[c.chave]}`)
    .join("\n");
  return `<processo>
Nome do processo: ${p.nome}
Tarefa em uma linha, escrita pelo grupo: ${p.tarefa || "(ainda não escrita)"}

Ficha:
${ficha || "- (sem ficha)"}

Materiais do kit:
${p.kitMateriais || "(sem materiais)"}

Exemplo de resultado bom:
${p.exemploBom || "(sem exemplo)"}

Exemplo de resultado ruim:
${p.exemploRuim || "(sem exemplo)"}
</processo>`;
}
