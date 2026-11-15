import type { Sql } from "./db";
import { FASES, DURACAO_INTERVALO_MIN } from "@/lib/jornada";
import { EVENTO_DEMO, MESAS_DEMO, PROCESSOS_DEMO } from "@/supabase/seed/demo";

/** Copia o roteiro padrão (lib/jornada) para um evento. */
export async function copiarRoteiro(sql: Sql, eventoId: string): Promise<void> {
  for (const f of FASES) {
    const [fase] = await sql<{ id: string }[]>`
      insert into fase (evento_id, ordem, chave, nome, nome_curto, duracao_min, entrega,
                        criterio, criterio_texto, aprofundamento, rotulo_contribuicao)
      values (${eventoId}, ${f.ordem}, ${f.chave}, ${f.nome}, ${f.nomeCurto}, ${f.duracaoMin},
              ${f.entrega}, ${f.criterio}, ${f.criterioTexto}, ${f.aprofundamento},
              ${f.rotuloContribuicao ?? ""})
      returning id`;
    for (const [i, p] of f.passos.entries()) {
      await sql`
        insert into passo (fase_id, ordem, chave, instrucao, papel, tipo_atividade, criterio,
                           config, permite_editar)
        values (${fase.id}, ${i + 1}, ${p.chave}, ${p.instrucao}, ${p.papel}, ${p.tipo},
                ${p.criterio}, ${sql.json((p.config ?? {}) as never)}, ${p.permiteEditar ?? false})`;
    }
  }
}

export interface ResultadoSemente {
  eventoId: string;
  mesas: { id: string; numero: number; codigo: string }[];
}

/** Cria o evento de demonstração com os processos e as mesas de supabase/seed/demo.ts. */
export async function semearDemo(sql: Sql): Promise<ResultadoSemente> {
  return sql.begin(async (tx) => {
    const t = tx as unknown as Sql;
    const [evento] = await t<{ id: string }[]>`
      insert into evento (nome, data, duracao_intervalo_min)
      values (${EVENTO_DEMO.nome}, ${EVENTO_DEMO.data}, ${DURACAO_INTERVALO_MIN})
      returning id`;
    await copiarRoteiro(t, evento.id);

    const processos = new Map<string, string>();
    for (const p of PROCESSOS_DEMO) {
      const [linha] = await t<{ id: string }[]>`
        insert into processo (evento_id, nome, ficha, kit_materiais, exemplo_bom, exemplo_ruim,
                              caso_exemplo, caso_novo)
        values (${evento.id}, ${p.nome}, ${t.json(p.ficha)}, ${p.kitMateriais}, ${p.exemploBom},
                ${p.exemploRuim}, ${p.casoExemplo}, ${p.casoNovo})
        returning id`;
      processos.set(p.chave, linha.id);
    }

    const mesas: ResultadoSemente["mesas"] = [];
    for (const m of MESAS_DEMO) {
      const [linha] = await t<{ id: string }[]>`
        insert into mesa (evento_id, numero, nome, codigo, processo_id)
        values (${evento.id}, ${m.numero}, ${m.nome}, ${m.codigo}, ${processos.get(m.processo) ?? null})
        returning id`;
      mesas.push({ id: linha.id, numero: m.numero, codigo: m.codigo });
    }
    return { eventoId: evento.id, mesas };
  });
}
