import type { Sql } from "./db";
import { PAPEIS, type ContextoCriterio, type Papel } from "@/lib/jornada";

// Monta o contexto que os critérios de passo e de fase precisam (RN03).

interface MesaDoContexto {
  id: string;
  tarefa: string;
}

interface LinhaProva {
  mesa_id: string;
  modelos: number;
  exemplos: number;
  validas: number;
  recusadas: number;
  rodadas: string[] | null;
}

const consultaProva = (sql: Sql, ids: string[]) => sql<LinhaProva[]>`
  select m.id as mesa_id,
    (select count(*)::int from arquivo a where a.mesa_id = m.id and a.caminho like 'arquivos/%'
       and a.caminho <> 'arquivos/INDICE.md') as modelos,
    (select count(*)::int from arquivo a where a.mesa_id = m.id and a.caminho like 'exemplos/%') as exemplos,
    (select count(*)::int from conferencia c where c.mesa_id = m.id and c.valida) as validas,
    (select count(*)::int from conferencia c where c.mesa_id = m.id and not c.valida) as recusadas,
    (select array_agg(distinct r.tipo) from rodada r where r.mesa_id = m.id and r.pasta_mesa_id = m.id) as rodadas
  from mesa m where m.id in ${sql(ids)}`;

function dadosDaProva(l: LinhaProva | undefined): Partial<ContextoCriterio> {
  return {
    modelos: l?.modelos ?? 0,
    exemplos: l?.exemplos ?? 0,
    conferenciasValidas: l?.validas ?? 0,
    conferenciasRecusadas: l?.recusadas ?? 0,
    rodadas: new Set(l?.rodadas ?? []),
  };
}

interface LinhaSkill {
  mesa_id: string;
  encerrada: boolean | null;
  skill_aprovada_versao: number | null;
  versao: number | null;
}

function dadosDaSkill(l: LinhaSkill | undefined): Partial<ContextoCriterio> {
  return {
    entrevistaEncerrada: Boolean(l?.encerrada),
    skillVersao: l?.versao ?? null,
    skillAprovadaVersao: l?.skill_aprovada_versao ?? null,
  };
}

function papeisValidos(lista: { papel: string }[]): Set<Papel> {
  return new Set(lista.map((l) => l.papel).filter((p): p is Papel => (PAPEIS as readonly string[]).includes(p)));
}

export async function contextoDaMesa(sql: Sql, mesa: MesaDoContexto): Promise<ContextoCriterio> {
  const [concluidos, papeis, lidos, skill, prova] = await Promise.all([
    sql<{ passo_id: string }[]>`select passo_id from passo_concluido where mesa_id = ${mesa.id}`,
    sql<{ papel: string }[]>`select papel from papel_mesa where mesa_id = ${mesa.id} and nome <> ''`,
    sql<{ passo_id: string }[]>`select passo_id from leitura where mesa_id = ${mesa.id}`,
    sql<LinhaSkill[]>`
      select m.id as mesa_id, e.encerrada_em is not null as encerrada, e.skill_aprovada_versao, a.versao
      from mesa m
      left join entrevista e on e.mesa_id = m.id
      left join arquivo a on a.mesa_id = m.id and a.caminho = 'SKILL.md'
      where m.id = ${mesa.id}`,
    consultaProva(sql, [mesa.id]),
  ]);
  return {
    concluidos: new Set(concluidos.map((c) => c.passo_id)),
    papeisComNome: papeisValidos(papeis),
    lidos: new Set(lidos.map((l) => l.passo_id)),
    tarefa: mesa.tarefa,
    ...dadosDaSkill(skill[0]),
    ...dadosDaProva(prova[0]),
  };
}

/** O mesmo contexto para várias mesas de uma vez (painel do admin). */
export async function contextosDasMesas(sql: Sql, mesas: MesaDoContexto[]): Promise<Map<string, ContextoCriterio>> {
  const mapa = new Map<string, ContextoCriterio>();
  if (mesas.length === 0) return mapa;
  const ids = mesas.map((m) => m.id);
  const [concluidos, papeis, lidos, skills, provas] = await Promise.all([
    sql<{ mesa_id: string; passo_id: string }[]>`
      select mesa_id, passo_id from passo_concluido where mesa_id in ${sql(ids)}`,
    sql<{ mesa_id: string; papel: string }[]>`
      select mesa_id, papel from papel_mesa where mesa_id in ${sql(ids)} and nome <> ''`,
    sql<{ mesa_id: string; passo_id: string }[]>`
      select mesa_id, passo_id from leitura where mesa_id in ${sql(ids)}`,
    sql<LinhaSkill[]>`
      select m.id as mesa_id, e.encerrada_em is not null as encerrada, e.skill_aprovada_versao, a.versao
      from mesa m
      left join entrevista e on e.mesa_id = m.id
      left join arquivo a on a.mesa_id = m.id and a.caminho = 'SKILL.md'
      where m.id in ${sql(ids)}`,
    consultaProva(sql, ids),
  ]);
  const agrupar = <T extends { mesa_id: string }>(linhas: T[], id: string) => linhas.filter((l) => l.mesa_id === id);
  for (const m of mesas) {
    mapa.set(m.id, {
      concluidos: new Set(agrupar(concluidos, m.id).map((c) => c.passo_id)),
      papeisComNome: papeisValidos(agrupar(papeis, m.id)),
      lidos: new Set(agrupar(lidos, m.id).map((l) => l.passo_id)),
      tarefa: m.tarefa,
      ...dadosDaSkill(skills.find((x) => x.mesa_id === m.id)),
      ...dadosDaProva(provas.find((x) => x.mesa_id === m.id)),
    });
  }
  return mapa;
}
