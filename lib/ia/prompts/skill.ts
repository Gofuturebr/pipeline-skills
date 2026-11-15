import { REGRAS_GERAIS } from "./comum";

// Fase 2: escrever o SKILL.md a partir da entrevista, e corrigir depois das
// duas perguntas finais. As 7 seções seguem a seção 3 da especificação.

export const SECOES_SKILL = [
  "Pra que serve",
  "Quando usar",
  "O que precisa",
  "Passos",
  "Decisões",
  "Pronto quando",
  "Casos que já deram errado",
] as const;

export type SecaoSkill = (typeof SECOES_SKILL)[number];

const FORMATO = `O arquivo tem exatamente este formato:

# Nome curto da skill (até 60 letras, diz o que ela faz)

## Pra que serve
Uma ou duas frases: que tarefa a skill faz e qual resultado entrega.

## Quando usar
Lista com as frases que alguém digitaria para pedir esta tarefa ao Claude. Use as palavras do dia a dia do grupo.

## O que precisa
Lista do que é preciso ter em mãos antes de começar.

## Passos
Lista numerada, na ordem real. Cada passo começa com um verbo e diz o que fazer, não o que pensar.

## Decisões
Lista no formato "Se ..., então ...".

## Pronto quando
Lista de conferências que alguém consegue verificar contra uma fonte, no formato "- [ ] o que conferir (fonte: onde conferir)". Nada de "claro", "profissional" ou "de qualidade".

## Casos que já deram errado
Lista: o que aconteceu e o que fazer para não repetir.`;

export const SISTEMA_ESCREVER_SKILL = `${REGRAS_GERAIS}

Seu papel agora: escrever o arquivo SKILL.md, as instruções que o Claude vai seguir para fazer esta tarefa do jeito do grupo. Quem lê o arquivo é o Claude, então escreva instruções diretas, no imperativo.

Regras:
- Use só o que o grupo disse na entrevista, mais a ficha e o kit. Não invente regras, números nem nomes.
- Onde faltou informação, escreva "A completar:" e diga o que falta.
- Seja específico: valores, prazos e nomes de arquivos que o grupo citou entram no texto.
- Mantenha as 7 seções, nesta ordem e com estes títulos, mesmo que alguma fique curta.

${FORMATO}

Responda só com o conteúdo do arquivo, sem nada antes nem depois.`;

export const SISTEMA_CORRIGIR_SKILL = `${REGRAS_GERAIS}

Seu papel agora: corrigir o arquivo SKILL.md com o que o grupo respondeu a duas perguntas: "O que eu errei?" e "O que vocês esqueceram de me contar?".

Regras:
- Faça a menor mudança que resolve. Não reescreva o que está certo.
- Mantenha as 7 seções, nesta ordem e com estes títulos.
- Não invente nada além do que o grupo disse.

${FORMATO}

Responda só com o conteúdo completo do arquivo corrigido, sem nada antes nem depois.`;

/** Garante as 7 seções, na ordem. O que faltar entra com "A completar". */
export function completarSecoes(conteudo: string): string {
  let texto = conteudo.replace(/^```(?:markdown|md)?\s*\n/, "").replace(/\n```\s*$/, "").trim();
  if (!/^#\s+\S/m.test(texto)) texto = `# Skill da mesa\n\n${texto}`;
  for (const secao of SECOES_SKILL) {
    const re = new RegExp(`^##\\s+${secao.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "mi");
    if (!re.test(texto)) texto += `\n\n## ${secao}\nA completar.`;
  }
  return `${texto.trim()}\n`;
}

/** Nome da skill a partir do título do arquivo, no formato de pasta: minúsculas e hífens. */
export function nomeDaPasta(conteudo: string): string {
  const titulo = conteudo.match(/^#\s+(.+)$/m)?.[1] ?? "skill-da-mesa";
  const nome = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return nome || "skill-da-mesa";
}

export const PERGUNTAS_FINAIS = ["O que eu errei?", "O que vocês esqueceram de me contar?"] as const;
