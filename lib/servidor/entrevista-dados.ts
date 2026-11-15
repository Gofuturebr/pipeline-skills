import type { Sql } from "./db";
import { PERGUNTAS_FINAIS } from "@/lib/ia/prompts/skill";
import { MINIMO_PERGUNTAS, TEMAS_ENTREVISTA, type TemaEntrevista } from "@/lib/jornada";
import type { EntrevistaApi } from "@/lib/tipos-api";

// Leitura da entrevista (Fase 2), sem chamar a IA. Separado para o estado da
// mesa poder usar sem depender das ações.

export const FASE_ENTREVISTA = 2;

export interface LinhaEntrevista {
  n_perguntas: number;
  temas: Record<string, boolean>;
  encerrada_em: Date | null;
  ocupada_ate: Date | null;
  skill_aprovada_versao: number | null;
  respostas_finais: { errou?: string; esqueceu?: string };
}

export interface LinhaMensagem {
  id: string;
  autor: "mesa" | "ia";
  texto: string;
  tipo: string;
  meta: { tema?: TemaEntrevista; temas_cobertos?: TemaEntrevista[] };
}

export async function garantirEntrevista(sql: Sql, mesaId: string): Promise<LinhaEntrevista> {
  await sql`insert into entrevista (mesa_id) values (${mesaId}) on conflict do nothing`;
  const [e] = await sql<LinhaEntrevista[]>`
    select n_perguntas, temas, encerrada_em, ocupada_ate, skill_aprovada_versao, respostas_finais
    from entrevista where mesa_id = ${mesaId}`;
  return e;
}

export async function mensagensDaEntrevista(sql: Sql, mesaId: string): Promise<LinhaMensagem[]> {
  return sql<LinhaMensagem[]>`
    select id, autor, texto, tipo, meta from mensagem
    where mesa_id = ${mesaId} and fase = ${FASE_ENTREVISTA} and tipo in ('pergunta', 'resposta')
    order by criado_em, id`;
}

export function temasCobertos(e: Pick<LinhaEntrevista, "temas">): TemaEntrevista[] {
  return TEMAS_ENTREVISTA.map((t) => t.chave).filter((t) => e.temas?.[t]);
}

/** O que falta para a IA poder escrever o SKILL.md (RN07), ou null. */
export function faltaParaEscrever(e: Pick<LinhaEntrevista, "n_perguntas" | "temas">): string | null {
  const faltamPerguntas = Math.max(0, MINIMO_PERGUNTAS - e.n_perguntas);
  const faltamTemas = TEMAS_ENTREVISTA.length - temasCobertos(e).length;
  const partes: string[] = [];
  if (faltamPerguntas > 0) partes.push(faltamPerguntas === 1 ? "1 pergunta" : `${faltamPerguntas} perguntas`);
  if (faltamTemas > 0) partes.push(faltamTemas === 1 ? "cobrir 1 tema" : `cobrir ${faltamTemas} temas`);
  return partes.length ? `Falta ${partes.join(" e ")}` : null;
}

export async function montarEntrevista(sql: Sql, mesaId: string): Promise<EntrevistaApi> {
  const [e] = await sql<LinhaEntrevista[]>`
    select n_perguntas, temas, encerrada_em, ocupada_ate, skill_aprovada_versao, respostas_finais
    from entrevista where mesa_id = ${mesaId}`;
  const msgs = await mensagensDaEntrevista(sql, mesaId);
  const perguntas: EntrevistaApi["perguntas"] = [];
  for (const m of msgs) {
    if (m.tipo === "pergunta") {
      const tema = m.meta.tema ?? null;
      perguntas.push({
        id: m.id,
        texto: m.texto,
        tema,
        temaNome: TEMAS_ENTREVISTA.find((t) => t.chave === tema)?.nome ?? "",
        resposta: null,
      });
    } else if (m.tipo === "resposta" && perguntas.length) {
      perguntas[perguntas.length - 1].resposta = m.texto;
    }
  }
  const base = e ?? { n_perguntas: 0, temas: {}, encerrada_em: null, ocupada_ate: null, skill_aprovada_versao: null, respostas_finais: {} };
  const falta = faltaParaEscrever(base);
  return {
    perguntas,
    temasCobertos: temasCobertos(base),
    respondidas: base.n_perguntas,
    minimo: MINIMO_PERGUNTAS,
    encerrada: Boolean(base.encerrada_em),
    ocupada: Boolean(base.ocupada_ate && base.ocupada_ate.getTime() > Date.now()),
    podeEncerrar: !falta,
    falta,
    skillAprovadaVersao: base.skill_aprovada_versao,
    respostasFinais: { errou: base.respostas_finais?.errou ?? "", esqueceu: base.respostas_finais?.esqueceu ?? "" },
    perguntasFinais: [...PERGUNTAS_FINAIS],
  };
}

