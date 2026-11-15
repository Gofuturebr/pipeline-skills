import { randomInt } from "node:crypto";
import type { Sql } from "./db";
import { recusa, registrar, type Autor, type Resultado } from "./acoes";
import { emitir } from "./sinais";
import { lerFicha, type Ficha } from "@/lib/processo";
import { canalAdmin, canalEvento } from "@/lib/sinais";
import type { PreparoApi } from "@/lib/tipos-api";

// Preparação do evento pelo admin (seção 5): evento, processos, mesas e textos
// do roteiro, sem mexer em código. Só o gestor.

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function semTravessao(texto: string): string | null {
  return /[\u2013\u2014]/.test(texto) ? "Troque o travessão por vírgula, ponto ou dois-pontos." : null;
}

async function avisar(eventoId: string) {
  await emitir([canalEvento(eventoId), canalAdmin(eventoId)], { tipo: "evento" });
}

export async function dadosDoPreparo(sql: Sql, eventoId: string): Promise<PreparoApi | null> {
  const [e] = await sql<{ nome: string; data: Date | string; duracao_intervalo_min: number; palavras_vagas: string[] }[]>`
    select nome, data, duracao_intervalo_min, palavras_vagas from evento where id = ${eventoId}`;
  if (!e) return null;
  const [fases, passos, processos, mesas] = await Promise.all([
    sql<{ id: string; ordem: number; nome: string; duracao_min: number; aprofundamento: string }[]>`
      select id, ordem, nome, duracao_min, aprofundamento from fase where evento_id = ${eventoId} order by ordem`,
    sql<{ id: string; fase_id: string; ordem: number; instrucao: string; papel: string; chave: string }[]>`
      select p.id, p.fase_id, p.ordem, p.instrucao, p.papel, p.chave
      from passo p join fase f on f.id = p.fase_id where f.evento_id = ${eventoId} order by f.ordem, p.ordem`,
    sql<{
      id: string;
      nome: string;
      ficha: unknown;
      kit_materiais: string;
      exemplo_bom: string;
      exemplo_ruim: string;
      caso_exemplo: string;
      caso_novo: string;
      mesas: number;
    }[]>`
      select p.*, (select count(*)::int from mesa m where m.processo_id = p.id) as mesas
      from processo p where p.evento_id = ${eventoId} order by p.criado_em`,
    sql<{ id: string; numero: number; nome: string; codigo: string; processo_id: string | null; fase_atual: number }[]>`
      select id, numero, nome, codigo, processo_id, fase_atual from mesa where evento_id = ${eventoId} order by numero`,
  ]);
  return {
    evento: {
      nome: e.nome,
      data: typeof e.data === "string" ? e.data : e.data.toISOString().slice(0, 10),
      duracaoIntervaloMin: e.duracao_intervalo_min,
      palavrasVagas: e.palavras_vagas ?? [],
    },
    fases: fases.map((f) => ({
      id: f.id,
      ordem: f.ordem,
      nome: f.nome,
      duracaoMin: f.duracao_min,
      aprofundamento: f.aprofundamento,
      passos: passos
        .filter((p) => p.fase_id === f.id)
        .map((p) => ({ id: p.id, ordem: p.ordem, instrucao: p.instrucao, papel: p.papel, chave: p.chave })),
    })),
    processos: processos.map((p) => ({
      id: p.id,
      nome: p.nome,
      ficha: lerFicha(p.ficha),
      kitMateriais: p.kit_materiais,
      exemploBom: p.exemplo_bom,
      exemploRuim: p.exemplo_ruim,
      casoExemplo: p.caso_exemplo,
      casoNovo: p.caso_novo,
      mesas: p.mesas,
    })),
    mesas: mesas.map((m) => ({
      id: m.id,
      numero: m.numero,
      nome: m.nome,
      codigo: m.codigo,
      processoId: m.processo_id,
      faseAtual: m.fase_atual,
    })),
  };
}

export async function salvarEvento(
  sql: Sql,
  eventoId: string,
  d: { nome: string; data: string; duracaoIntervaloMin: number; palavrasVagas: string[] },
  autor: Autor,
): Promise<Resultado> {
  const nome = d.nome.trim();
  if (!nome) return recusa("Escreva o nome do evento.", 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data)) return recusa("Data inválida.", 400);
  if (d.duracaoIntervaloMin < 1 || d.duracaoIntervaloMin > 60) return recusa("O intervalo vai de 1 a 60 minutos.", 400);
  const palavras = [...new Set(d.palavrasVagas.map((p) => p.trim().toLowerCase()).filter(Boolean))].slice(0, 40);
  await sql`
    update evento set nome = ${nome}, data = ${d.data}, duracao_intervalo_min = ${d.duracaoIntervaloMin},
      palavras_vagas = ${palavras}
    where id = ${eventoId}`;
  await registrar(sql, eventoId, null, "preparo_evento", autor);
  await avisar(eventoId);
  return { ok: true };
}

export async function salvarFase(
  sql: Sql,
  eventoId: string,
  faseId: string,
  d: { duracaoMin: number; aprofundamento: string },
  autor: Autor,
): Promise<Resultado> {
  if (!Number.isInteger(d.duracaoMin) || d.duracaoMin < 1 || d.duracaoMin > 120) {
    return recusa("A duração vai de 1 a 120 minutos.", 400);
  }
  const problema = semTravessao(d.aprofundamento);
  if (problema) return recusa(problema, 400);
  const r = await sql`
    update fase set duracao_min = ${d.duracaoMin}, aprofundamento = ${d.aprofundamento.trim()}
    where id = ${faseId} and evento_id = ${eventoId} returning id`;
  if (!r.length) return recusa("Fase não encontrada.", 404);
  await registrar(sql, eventoId, null, "preparo_fase", autor, { fase: faseId });
  await avisar(eventoId);
  return { ok: true };
}

export async function salvarPasso(sql: Sql, eventoId: string, passoId: string, instrucao: string, autor: Autor): Promise<Resultado> {
  const texto = instrucao.replace(/\s+/g, " ").trim();
  if (!texto) return recusa("A instrução não pode ficar vazia.", 400);
  if (texto.length > 300) return recusa("A instrução pode ter até 300 caracteres.", 400);
  const problema = semTravessao(texto);
  if (problema) return recusa(problema, 400);
  const r = await sql`
    update passo p set instrucao = ${texto} from fase f
    where p.id = ${passoId} and f.id = p.fase_id and f.evento_id = ${eventoId} returning p.id`;
  if (!r.length) return recusa("Passo não encontrado.", 404);
  await registrar(sql, eventoId, null, "preparo_passo", autor, { passo: passoId });
  await avisar(eventoId);
  return { ok: true };
}

export interface DadosProcesso {
  id?: string | null;
  nome: string;
  ficha: Ficha;
  kitMateriais: string;
  exemploBom: string;
  exemploRuim: string;
  casoExemplo: string;
  casoNovo: string;
}

export async function salvarProcesso(sql: Sql, eventoId: string, d: DadosProcesso, autor: Autor): Promise<Resultado> {
  const nome = d.nome.trim();
  if (!nome) return recusa("Escreva o nome do processo.", 400);
  const ficha = lerFicha(d.ficha);
  if (d.id) {
    const r = await sql`
      update processo set nome = ${nome}, ficha = ${sql.json(ficha)}, kit_materiais = ${d.kitMateriais},
        exemplo_bom = ${d.exemploBom}, exemplo_ruim = ${d.exemploRuim}, caso_exemplo = ${d.casoExemplo},
        caso_novo = ${d.casoNovo}
      where id = ${d.id} and evento_id = ${eventoId} returning id`;
    if (!r.length) return recusa("Processo não encontrado.", 404);
  } else {
    await sql`
      insert into processo (evento_id, nome, ficha, kit_materiais, exemplo_bom, exemplo_ruim, caso_exemplo, caso_novo)
      values (${eventoId}, ${nome}, ${sql.json(ficha)}, ${d.kitMateriais}, ${d.exemploBom}, ${d.exemploRuim},
              ${d.casoExemplo}, ${d.casoNovo})`;
  }
  await registrar(sql, eventoId, null, "preparo_processo", autor, { nome });
  await avisar(eventoId);
  return { ok: true };
}

export async function removerProcesso(sql: Sql, eventoId: string, id: string, autor: Autor): Promise<Resultado> {
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from mesa where processo_id = ${id}`;
  if (n > 0) return recusa("Este processo está atribuído a uma mesa. Troque o processo da mesa antes.");
  const r = await sql`delete from processo where id = ${id} and evento_id = ${eventoId} returning id`;
  if (!r.length) return recusa("Processo não encontrado.", 404);
  await registrar(sql, eventoId, null, "preparo_processo_removido", autor);
  await avisar(eventoId);
  return { ok: true };
}

async function codigoNovo(sql: Sql): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const c = Array.from({ length: 6 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
    const [existe] = await sql`select 1 from mesa where codigo = ${c}`;
    if (!existe) return c;
  }
  throw new Error("Não foi possível gerar um código de mesa único");
}

export async function salvarMesa(
  sql: Sql,
  eventoId: string,
  d: { id?: string | null; nome: string; processoId: string | null },
  autor: Autor,
): Promise<Resultado> {
  const nome = d.nome.trim();
  if (d.processoId) {
    const [p] = await sql`select 1 from processo where id = ${d.processoId} and evento_id = ${eventoId}`;
    if (!p) return recusa("Processo não encontrado.", 404);
  }
  if (d.id) {
    if (!nome) return recusa("Escreva o nome da mesa.", 400);
    const r = await sql`
      update mesa set nome = ${nome}, processo_id = ${d.processoId}, versao = versao + 1
      where id = ${d.id} and evento_id = ${eventoId} returning id`;
    if (!r.length) return recusa("Mesa não encontrada.", 404);
  } else {
    const [{ proximo }] = await sql<{ proximo: number }[]>`
      select coalesce(max(numero), 0)::int + 1 as proximo from mesa where evento_id = ${eventoId}`;
    await sql`
      insert into mesa (evento_id, numero, nome, codigo, processo_id)
      values (${eventoId}, ${proximo}, ${nome || `Mesa ${String(proximo).padStart(2, "0")}`}, ${await codigoNovo(sql)},
              ${d.processoId})`;
  }
  await registrar(sql, eventoId, d.id ?? null, "preparo_mesa", autor, { nome });
  await avisar(eventoId);
  return { ok: true };
}

/** Só sai do evento uma mesa que ainda não começou: Fase 0, sem pasta e sem celulares. */
export async function removerMesa(sql: Sql, eventoId: string, id: string, autor: Autor): Promise<Resultado> {
  const [m] = await sql<{ fase_atual: number; arquivos: number; pessoas: number }[]>`
    select fase_atual,
      (select count(*)::int from arquivo where mesa_id = m.id) as arquivos,
      (select count(*)::int from participante where mesa_id = m.id) as pessoas
    from mesa m where id = ${id} and evento_id = ${eventoId}`;
  if (!m) return recusa("Mesa não encontrada.", 404);
  if (m.fase_atual > 0 || m.arquivos > 0 || m.pessoas > 0) {
    return recusa("Esta mesa já começou. Para não perder nada, ela não pode ser removida.");
  }
  await sql`delete from mesa where id = ${id}`;
  await registrar(sql, eventoId, null, "preparo_mesa_removida", autor);
  await avisar(eventoId);
  return { ok: true };
}
