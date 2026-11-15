import { lerSecao } from "@/lib/markdown";

// Formato de skill do Claude (documentação da Anthropic, Agent Skills):
// - SKILL.md com cabeçalho YAML: name e description.
// - name: até 64 caracteres, só minúsculas, números e hífens, sem "anthropic" nem "claude".
//   No claude.ai, o nome da pasta precisa ser igual ao name.
// - description: o que a skill faz e quando usar, em terceira pessoa, até 1024 caracteres.
//   A central de ajuda cita 200 caracteres; o sistema tenta ficar abaixo disso.
// - O .zip para o claude.ai tem a pasta da skill na raiz.

export const LIMITE_NOME = 64;
export const LIMITE_DESCRICAO = 1024;
export const DESCRICAO_IDEAL = 200;

/** Nome no formato exigido: minúsculas, números e hífens, sem palavras reservadas. */
export function nomeValido(texto: string): string {
  const base = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .split("-")
    .filter((p) => p && p !== "claude" && p !== "anthropic")
    .join("-")
    .slice(0, LIMITE_NOME)
    .replace(/-+$/g, "");
  return base || "skill-da-mesa";
}

function primeiraFrase(texto: string): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  const m = limpo.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : limpo).trim();
}

function frasesDeQuandoUsar(corpo: string): string[] {
  return corpo
    .split("\n")
    .map((l) => l.replace(/^\s*[-*]\s+/, "").replace(/^["“]|["”]$/g, "").trim())
    .filter((l) => l && !/^a completar/i.test(l));
}

function semMarcacao(texto: string): string {
  return texto.replace(/<[^>]*>/g, "").replace(/[`*_#]/g, "").trim();
}

/** Descrição gerada a partir das seções Pra que serve e Quando usar. */
export function descricaoDaSkill(skill: string): string {
  const pra = semMarcacao(primeiraFrase(lerSecao(skill, "Pra que serve") ?? ""));
  const frases = frasesDeQuandoUsar(lerSecao(skill, "Quando usar") ?? "").map(semMarcacao);
  let descricao = pra || "Skill criada na Oficina de Criação de Skills.";
  for (let n = frases.length; n >= 0; n--) {
    const parte = n > 0 ? ` Usar quando alguém pedir: ${frases.slice(0, n).map((f) => `"${f}"`).join(", ")}.` : "";
    const tentativa = `${pra}${parte}`.trim();
    if (tentativa.length <= DESCRICAO_IDEAL || n === 0) {
      descricao = tentativa || descricao;
      break;
    }
  }
  return descricao.slice(0, LIMITE_DESCRICAO);
}

/** SKILL.md com o cabeçalho exigido no topo. */
export function skillComCabecalho(skill: string, nome: string): string {
  const corpo = skill.replace(/^---\n[\s\S]*?\n---\n*/, "").trim();
  return `---\nname: ${nomeValido(nome)}\ndescription: ${JSON.stringify(descricaoDaSkill(corpo))}\n---\n\n${corpo}\n`;
}

export function leiaMe(nome: string, descricao: string): string {
  return `# Como instalar a skill ${nome}

${descricao}

Esta pasta é uma skill do Claude criada na Oficina de Criação de Skills (InovaPB).

## Instalar no claude.ai

1. No claude.ai, abra Configurações > Capacidades e ligue "Execução de código e criação de arquivos" (em inglês, "Code execution and file creation").
2. Abra Personalizar > Skills (claude.ai/customize/skills), clique em "+", depois em "Criar skill" e em "Enviar uma skill" (em inglês: "+ Create skill" e "Upload a skill"). Escolha o arquivo ${nome}.zip, sem descompactar.
3. Confira se a skill está ligada na lista. Depois, peça a tarefa ao Claude com as palavras da seção "Quando usar" do SKILL.md.

As skills funcionam nos planos pagos e, segundo a central de ajuda da Anthropic, também no plano gratuito. Em contas de empresa, quem administra a conta precisa permitir skills.

## O que tem na pasta

- SKILL.md: as instruções que o Claude segue.
- arquivos/: modelos com lacunas e o INDICE.md, que lista cada um.
- exemplos/: resultados aprovados pela mesa.
- notas.md: os consertos feitos, o mais novo em cima.
`;
}
