import type { Sql } from "./db";
import { iso, type LinhaMesa } from "./consultas";
import { recusa, type Resultado } from "./acoes";
import { acharSensivel, mensagemSensivel } from "@/lib/sensivel";
import type { ArquivoApi, VersaoArquivoApi } from "@/lib/tipos-api";

// A pasta da mesa: uma única versão de cada arquivo (RN06). Toda alteração
// entra no histórico por gatilho no banco. Nada sensível é salvo (RN14) e skill
// final não muda (RN15).

export const CAMINHOS_VALIDOS = /^(SKILL\.md|notas\.md|arquivos\/INDICE\.md|arquivos\/[a-z0-9][a-z0-9._-]{0,80}\.md|exemplos\/[a-z0-9][a-z0-9._-]{0,80}\.md)$/;

interface OpcoesSalvar {
  autor: "mesa" | "ia";
  versaoEsperada?: number;
  /** Só o gestor mexe em skill final; os demais salvamentos respeitam a trava. */
  ignorarFinal?: boolean;
}

export async function salvarArquivo(
  tx: Sql,
  mesa: LinhaMesa,
  caminho: string,
  conteudo: string,
  opcoes: OpcoesSalvar,
): Promise<Resultado<{ versao: number }>> {
  if (!CAMINHOS_VALIDOS.test(caminho)) return recusa("Nome de arquivo inválido.", 400);
  if (mesa.final && !opcoes.ignorarFinal) {
    return recusa("A skill foi marcada como final e não pode mais ser editada. Só o gestor destrava.", 409);
  }
  const achado = acharSensivel(conteudo);
  if (achado) return recusa(mensagemSensivel(achado), 400);
  if (conteudo.length > 60_000) return recusa("O arquivo ficou grande demais. Encurtem o texto.", 400);

  if (opcoes.versaoEsperada !== undefined) {
    const [atual] = await tx<{ versao: number }[]>`
      select versao from arquivo where mesa_id = ${mesa.id} and caminho = ${caminho} for update`;
    if (atual && atual.versao !== opcoes.versaoEsperada) {
      return recusa("O arquivo mudou em outra tela. Vejam a versão nova antes de guardar.", 409);
    }
  }
  const [linha] = await tx<{ versao: number }[]>`
    insert into arquivo (mesa_id, caminho, conteudo, fase_alterada, passo_alterado, autor)
    values (${mesa.id}, ${caminho}, ${conteudo}, ${mesa.fase_atual}, ${mesa.passo_atual}, ${opcoes.autor})
    on conflict (mesa_id, caminho) do update
      set conteudo = excluded.conteudo, fase_alterada = excluded.fase_alterada,
          passo_alterado = excluded.passo_alterado, autor = excluded.autor
    returning versao`;
  return { ok: true, dados: { versao: linha.versao } };
}

export async function lerArquivo(sql: Sql, mesaId: string, caminho: string): Promise<{ conteudo: string; versao: number } | null> {
  const [a] = await sql<{ conteudo: string; versao: number }[]>`
    select conteudo, versao from arquivo where mesa_id = ${mesaId} and caminho = ${caminho}`;
  return a ?? null;
}

interface LinhaArquivo {
  caminho: string;
  conteudo: string;
  versao: number;
  fase_alterada: number;
  autor: string;
  atualizado_em: Date;
}

export async function arquivosDaMesa(sql: Sql, mesaId: string): Promise<ArquivoApi[]> {
  const linhas = await sql<LinhaArquivo[]>`
    select caminho, conteudo, versao, fase_alterada, autor, atualizado_em
    from arquivo where mesa_id = ${mesaId}`;
  const ordem = (c: string) => (c === "SKILL.md" ? 0 : c.startsWith("arquivos/") ? 1 : c.startsWith("exemplos/") ? 2 : 3);
  return linhas
    .sort((a, b) => ordem(a.caminho) - ordem(b.caminho) || a.caminho.localeCompare(b.caminho))
    .map((l) => ({
      caminho: l.caminho,
      conteudo: l.conteudo,
      versao: l.versao,
      faseAlterada: l.fase_alterada,
      autor: l.autor,
      atualizadoEm: iso(l.atualizado_em) as string,
    }));
}

export async function versoesDoArquivo(sql: Sql, mesaId: string, caminho: string): Promise<VersaoArquivoApi[]> {
  const linhas = await sql<{ versao: number; conteudo: string; fase: number; autor: string; criado_em: Date }[]>`
    select v.versao, v.conteudo, v.fase, v.autor, v.criado_em
    from arquivo_versao v join arquivo a on a.id = v.arquivo_id
    where a.mesa_id = ${mesaId} and a.caminho = ${caminho}
    order by v.versao desc`;
  return linhas.map((l) => ({
    versao: l.versao,
    conteudo: l.conteudo,
    fase: l.fase,
    autor: l.autor,
    criadoEm: iso(l.criado_em) as string,
  }));
}
