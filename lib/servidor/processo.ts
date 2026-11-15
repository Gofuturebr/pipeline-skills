import type { Sql } from "./db";
import type { LinhaMesa } from "./consultas";
import type { ContextoProcesso } from "@/lib/ia/prompts/comum";
import { lerFicha } from "@/lib/processo";

export interface LinhaProcessoCompleto {
  id: string;
  nome: string;
  ficha: unknown;
  kit_materiais: string;
  exemplo_bom: string;
  exemplo_ruim: string;
  caso_exemplo: string;
  caso_novo: string;
}

export async function processoDaMesa(sql: Sql, mesa: Pick<LinhaMesa, "processo_id">): Promise<LinhaProcessoCompleto | null> {
  if (!mesa.processo_id) return null;
  const [p] = await sql<LinhaProcessoCompleto[]>`
    select id, nome, ficha, kit_materiais, exemplo_bom, exemplo_ruim, caso_exemplo, caso_novo
    from processo where id = ${mesa.processo_id}`;
  return p ?? null;
}

/** Ficha, kit e tarefa da mesa, no formato dos prompts da IA. */
export async function contextoDoProcesso(sql: Sql, mesa: LinhaMesa): Promise<ContextoProcesso> {
  const p = await processoDaMesa(sql, mesa);
  return {
    nome: p?.nome ?? mesa.processo_nome ?? "Processo da mesa",
    ficha: lerFicha(p?.ficha),
    kitMateriais: p?.kit_materiais ?? "",
    exemploBom: p?.exemplo_bom ?? "",
    exemploRuim: p?.exemplo_ruim ?? "",
    tarefa: mesa.tarefa,
  };
}
