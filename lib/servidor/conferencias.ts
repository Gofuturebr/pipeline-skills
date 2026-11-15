import type { Sql } from "./db";
import { roteiroDoEvento, type LinhaMesa } from "./consultas";
import { avisarMudanca, recusa, travarMesa, type Resultado } from "./acoes";
import { lerArquivo, salvarArquivo } from "./arquivos";
import {
  MAXIMO_CONFERENCIAS,
  linhaProntoQuando,
  lerProntoQuando,
  motivoDaRecusa,
} from "@/lib/conferencias";
import { lerSecao, trocarSecao } from "@/lib/markdown";
import { acharSensivel, mensagemSensivel } from "@/lib/sensivel";
import type { ConferenciaApi } from "@/lib/tipos-api";

// Conferências da prova (Fase 4). Cada uma é validada ao salvar (RN08) e a
// seção Pronto quando do SKILL.md acompanha as conferências válidas.

const PALAVRAS_PADRAO = ["claro", "profissional", "de qualidade"];

interface LinhaConferencia {
  id: string;
  ordem: number;
  descricao: string;
  fonte: string;
  valida: boolean;
  motivo_recusa: string | null;
}

export async function conferenciasDaMesa(sql: Sql, mesaId: string): Promise<ConferenciaApi[]> {
  const linhas = await sql<LinhaConferencia[]>`
    select id, ordem, descricao, fonte, valida, motivo_recusa from conferencia
    where mesa_id = ${mesaId} order by ordem`;
  return linhas.map((l, i) => ({
    id: l.id,
    numero: i + 1,
    descricao: l.descricao,
    fonte: l.fonte,
    valida: l.valida,
    motivo: l.motivo_recusa,
  }));
}

async function palavrasVagas(sql: Sql, mesa: LinhaMesa): Promise<string[]> {
  const [e] = await sql<{ palavras_vagas: string[] | null }[]>`
    select palavras_vagas from evento where id = ${mesa.evento_id}`;
  return e?.palavras_vagas?.length ? e.palavras_vagas : PALAVRAS_PADRAO;
}

/** Abre transação com a mesa travada e confere se a fase atual tem conferências. */
async function naProva(
  sql: Sql,
  mesaId: string,
  executar: (tx: Sql, mesa: LinhaMesa, vagas: string[]) => Promise<Resultado>,
): Promise<Resultado> {
  let afetada: LinhaMesa | null = null;
  const r = await sql.begin(async (txBruta): Promise<Resultado> => {
    const tx = txBruta as unknown as Sql;
    const mesa = await travarMesa(tx, mesaId);
    if (!mesa) return recusa("Mesa não encontrada.", 404);
    if (mesa.estado === "pausada") return recusa("A mesa está pausada.");
    if (mesa.final) return recusa("A skill já foi marcada como final.");
    const roteiro = await roteiroDoEvento(tx, mesa.evento_id);
    const passos = roteiro.passosPorFase.get(mesa.fase_atual) ?? [];
    if (!passos.some((p) => p.tipo_atividade === "conferencias")) {
      return recusa("As conferências são da Fase 4.", 403);
    }
    const resultado = await executar(tx, mesa, await palavrasVagas(tx, mesa));
    if (resultado.ok) {
      await sincronizarProntoQuando(tx, mesa);
      afetada = mesa;
    }
    return resultado;
  });
  if (r.ok && afetada) await avisarMudanca(afetada);
  return r;
}

/** Reescreve a seção Pronto quando do SKILL.md com as conferências válidas. */
export async function sincronizarProntoQuando(tx: Sql, mesa: LinhaMesa): Promise<void> {
  const skill = await lerArquivo(tx, mesa.id, "SKILL.md");
  if (!skill) return;
  const validas = await tx<{ descricao: string; fonte: string }[]>`
    select descricao, fonte from conferencia where mesa_id = ${mesa.id} and valida order by ordem`;
  if (validas.length === 0) return;
  const corpo = validas.map((c) => linhaProntoQuando(c.descricao, c.fonte)).join("\n");
  if ((lerSecao(skill.conteudo, "Pronto quando") ?? "").trim() === corpo) return;
  await salvarArquivo(tx, mesa, "SKILL.md", trocarSecao(skill.conteudo, "Pronto quando", corpo), { autor: "mesa" });
}

export async function salvarConferencia(
  sql: Sql,
  mesaId: string,
  dados: { id?: string | null; descricao: string; fonte: string },
): Promise<Resultado> {
  const descricao = dados.descricao.replace(/\s+/g, " ").trim();
  const fonte = dados.fonte.replace(/\s+/g, " ").trim();
  for (const t of [descricao, fonte]) {
    const achado = acharSensivel(t);
    if (achado) return recusa(mensagemSensivel(achado), 400);
  }
  return naProva(sql, mesaId, async (tx, mesa, vagas) => {
    const motivo = motivoDaRecusa(descricao, fonte, vagas);
    if (dados.id) {
      const r = await tx`
        update conferencia set descricao = ${descricao}, fonte = ${fonte}, valida = ${motivo === null},
          motivo_recusa = ${motivo}
        where id = ${dados.id} and mesa_id = ${mesa.id} returning id`;
      if (r.length === 0) return recusa("Conferência não encontrada.", 404);
    } else {
      const [{ n, proxima }] = await tx<{ n: number; proxima: number }[]>`
        select count(*)::int as n, coalesce(max(ordem), 0)::int + 1 as proxima
        from conferencia where mesa_id = ${mesa.id}`;
      if (n >= MAXIMO_CONFERENCIAS) return recusa(`A prova tem no máximo ${MAXIMO_CONFERENCIAS} conferências.`);
      await tx`
        insert into conferencia (mesa_id, ordem, descricao, fonte, valida, motivo_recusa)
        values (${mesa.id}, ${proxima}, ${descricao}, ${fonte}, ${motivo === null}, ${motivo})`;
    }
    return { ok: true };
  });
}

export async function removerConferencia(sql: Sql, mesaId: string, id: string): Promise<Resultado> {
  return naProva(sql, mesaId, async (tx, mesa) => {
    const r = await tx`delete from conferencia where id = ${id} and mesa_id = ${mesa.id} returning id`;
    return r.length ? { ok: true } : recusa("Conferência não encontrada.", 404);
  });
}

/** Traz para a lista as conferências que a IA escreveu na seção Pronto quando. */
export async function importarDoSkill(sql: Sql, mesaId: string): Promise<Resultado> {
  return naProva(sql, mesaId, async (tx, mesa, vagas) => {
    const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from conferencia where mesa_id = ${mesa.id}`;
    if (n > 0) return recusa("A lista já tem conferências.");
    const skill = await lerArquivo(tx, mesa.id, "SKILL.md");
    const itens = lerProntoQuando(lerSecao(skill?.conteudo ?? "", "Pronto quando") ?? "").slice(0, MAXIMO_CONFERENCIAS);
    if (itens.length === 0) return recusa("O SKILL.md não tem conferências para trazer.");
    for (const [i, c] of itens.entries()) {
      const motivo = acharSensivel(`${c.descricao} ${c.fonte}`) ? "Troque o dado sensível por um fictício" : motivoDaRecusa(c.descricao, c.fonte, vagas);
      await tx`
        insert into conferencia (mesa_id, ordem, descricao, fonte, valida, motivo_recusa)
        values (${mesa.id}, ${i + 1}, ${c.descricao.slice(0, 400)}, ${c.fonte.slice(0, 300)}, ${motivo === null}, ${motivo})`;
    }
    return { ok: true };
  });
}
