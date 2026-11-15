import type { Sql } from "@/lib/servidor/db";
import { gerarZip, type ArquivoZip } from "./zip";
import { descricaoDaSkill, leiaMe, nomeValido, skillComCabecalho } from "./skill";

// Monta a pasta final da skill para download. Não inclui a conversa com a IA
// nem os nomes dos participantes (seção 7 da especificação).

export interface PacoteSkill {
  nome: string;
  descricao: string;
  arquivos: ArquivoZip[];
  final: boolean;
}

export async function pacoteDaSkill(sql: Sql, mesaId: string): Promise<PacoteSkill | null> {
  const [mesa] = await sql<{ nome_skill: string; final: boolean; numero: number }[]>`
    select nome_skill, final, numero from mesa where id = ${mesaId}`;
  if (!mesa) return null;
  const arquivos = await sql<{ caminho: string; conteudo: string }[]>`
    select caminho, conteudo from arquivo where mesa_id = ${mesaId} order by caminho`;
  const skill = arquivos.find((a) => a.caminho === "SKILL.md");
  if (!skill) return null;
  const titulo = skill.conteudo.match(/^#\s+(.+)$/m)?.[1] ?? "";
  const nome = nomeValido(mesa.nome_skill || titulo || `skill-mesa-${mesa.numero}`);
  const descricao = descricaoDaSkill(skill.conteudo);
  const lista: ArquivoZip[] = [{ caminho: `${nome}/SKILL.md`, conteudo: skillComCabecalho(skill.conteudo, nome) }];
  for (const a of arquivos) {
    if (a.caminho !== "SKILL.md") lista.push({ caminho: `${nome}/${a.caminho}`, conteudo: a.conteudo });
  }
  if (!arquivos.some((a) => a.caminho === "notas.md")) {
    lista.push({ caminho: `${nome}/notas.md`, conteudo: "# Notas de conserto\n\nNenhum conserto registrado.\n" });
  }
  lista.push({ caminho: `${nome}/LEIA-ME.md`, conteudo: leiaMe(nome, descricao) });
  return { nome, descricao, arquivos: lista, final: mesa.final };
}

export async function zipDaSkill(sql: Sql, mesaId: string): Promise<{ nome: string; zip: Uint8Array } | null> {
  const p = await pacoteDaSkill(sql, mesaId);
  if (!p) return null;
  return { nome: p.nome, zip: gerarZip(p.arquivos) };
}

/** Pasta consolidada do evento: LEIA-ME, uma pasta por skill e o .zip de cada uma. */
export async function zipConsolidado(sql: Sql, eventoId: string): Promise<Uint8Array> {
  const mesas = await sql<{ id: string; numero: number; nome: string }[]>`
    select id, numero, nome from mesa where evento_id = ${eventoId} order by numero`;
  const raiz = "skills-sebrae-inovapb";
  const arquivos: ArquivoZip[] = [];
  const linhas: string[] = [];
  for (const m of mesas) {
    const p = await pacoteDaSkill(sql, m.id);
    if (!p) continue;
    const pasta = `${String(m.numero).padStart(2, "0")}-${p.nome}`;
    for (const a of p.arquivos) arquivos.push({ caminho: `${raiz}/${pasta}/${a.caminho.slice(p.nome.length + 1)}`, conteudo: a.conteudo });
    arquivos.push({ caminho: `${raiz}/zips/${p.nome}.zip`, conteudo: gerarZip(p.arquivos) });
    linhas.push(`- ${pasta} (${m.nome}${p.final ? "" : ", ainda não marcada como final"}): ${p.descricao}`);
  }
  arquivos.unshift({
    caminho: `${raiz}/LEIA-ME.md`,
    conteudo: `# Skills da Oficina de Criação de Skills (InovaPB)

Cada pasta numerada é uma skill. Na pasta zips/ está o arquivo pronto para enviar ao claude.ai.

## Skills

${linhas.join("\n") || "Nenhuma skill escrita ainda."}

## Como instalar

1. No claude.ai, abra Configurações > Capacidades e ligue "Execução de código e criação de arquivos".
2. Abra Personalizar > Skills (claude.ai/customize/skills), clique em "+", "Criar skill" e "Enviar uma skill". Escolha o .zip da pasta zips/, sem descompactar.
3. Confira se a skill está ligada e peça a tarefa com as palavras da seção "Quando usar" do SKILL.md.
`,
  });
  return gerarZip(arquivos);
}

export function respostaZip(nome: string, zip: Uint8Array): Response {
  return new Response(zip as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nome}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
