import type { Sql } from "./db";
import { emitir } from "./sinais";
import {
  eventoPorId,
  mesaPorId,
  mesasDoEvento,
  passosConcluidos,
  roteiroDoEvento,
  type LinhaMesa,
} from "./consultas";
import { avaliacaoDaFase } from "./estado-mesa";
import { contextoDaMesa } from "./contexto";
import { avaliarPasso } from "@/lib/jornada";
import { passoDeEntrada, transicao, ULTIMA_FASE, type AcaoMesa } from "@/lib/maquina";
import { canalAdmin, canalEvento, canalMesa, type TipoSinal } from "@/lib/sinais";

export type PerfilAutor = "gestor" | "facilitador" | "mesa" | "sistema";

export interface Autor {
  perfil: PerfilAutor;
  nome: string;
}

export type Resultado<T = undefined> = { ok: true; dados?: T } | { ok: false; motivo: string; status: number };

export const recusa = (motivo: string, status = 409): Resultado<never> => ({ ok: false, motivo, status });

/** Avisa a mesa e o painel de que algo mudou. Sempre depois do commit. */
export async function avisarMudanca(mesa: { id: string; evento_id: string }, tipo: TipoSinal = "mesa") {
  await emitir([canalMesa(mesa.id), canalAdmin(mesa.evento_id)], { tipo, mesaId: mesa.id });
}

export async function registrar(
  sql: Sql,
  eventoId: string,
  mesaId: string | null,
  acao: string,
  autor: Autor,
  detalhes: Record<string, unknown> = {},
) {
  await sql`
    insert into registro (evento_id, mesa_id, acao, autor_perfil, autor_nome, detalhes)
    values (${eventoId}, ${mesaId}, ${acao}, ${autor.perfil}, ${autor.nome},
            ${sql.json(detalhes as never)})`;
}

export async function travarMesa(sql: Sql, mesaId: string): Promise<LinhaMesa | null> {
  await sql`select id from mesa where id = ${mesaId} for update`;
  return mesaPorId(sql, mesaId);
}

const NOME_ACAO: Record<AcaoMesa["tipo"], string> = {
  concluir_fase: "concluir_fase",
  avancar: "avancar",
  forcar: "forcar",
  voltar: "voltar",
  desfazer_avanco: "desfazer_avanco",
  pausar: "pausar",
  retomar: "retomar",
};

/** Janela em que o gestor pode desfazer um avanço. */
export const JANELA_DESFAZER_S = 30;

/**
 * Aplica uma ação da máquina de estados numa mesa, dentro de uma transação com
 * a linha travada, e grava o registro com autor e horário (RN16).
 */
export async function aplicarAcaoMesa(
  sql: Sql,
  mesaId: string,
  construirAcao: (mesa: LinhaMesa, tx: Sql) => Promise<AcaoMesa | Resultado<never>>,
  autor: Autor,
): Promise<Resultado> {
  let mesaAfetada: LinhaMesa | null = null;
  const resultado = await sql.begin(async (txBruta): Promise<Resultado> => {
    const tx = txBruta as unknown as Sql;
    const mesa = await travarMesa(tx, mesaId);
    if (!mesa) return recusa("Mesa não encontrada.", 404);
    const acao = await construirAcao(mesa, tx);
    if ("ok" in acao) return acao;

    const r = transicao(
      { fase: mesa.fase_atual, estado: mesa.estado, estadoAntesPausa: mesa.estado_antes_pausa, final: mesa.final },
      acao,
    );
    if (!r.ok) return recusa(r.motivo);

    let relogioAnterior: Record<string, unknown> | undefined;
    if (acao.tipo === "desfazer_avanco") {
      const [ultimo] = await tx<{ acao: string; detalhes: Record<string, unknown>; segundos: number }[]>`
        select acao, detalhes, extract(epoch from now() - criado_em)::int as segundos
        from registro where mesa_id = ${mesa.id}
          and acao in ('avancar', 'forcar', 'voltar', 'desfazer_avanco')
        order by criado_em desc limit 1`;
      if (!ultimo || ultimo.acao !== "avancar" || ultimo.segundos > JANELA_DESFAZER_S) {
        return recusa("Não há avanço recente para desfazer.");
      }
      relogioAnterior = ultimo.detalhes.relogioAnterior as Record<string, unknown>;
    }

    const novo = r.novo;
    if (r.efeitos.mudouFase) {
      const roteiro = await roteiroDoEvento(tx, mesa.evento_id);
      const concluidos = await passosConcluidos(tx, mesa.id);
      const passos = roteiro.passosPorFase.get(novo.fase) ?? [];
      const ordensConcluidas = new Set(passos.filter((p) => concluidos.has(p.id)).map((p) => p.ordem));
      const passo = relogioAnterior
        ? Number(relogioAnterior.passo_atual)
        : passoDeEntrada(passos.map((p) => p.ordem), ordensConcluidas);
      await tx`
        update mesa set
          fase_atual = ${novo.fase},
          passo_atual = ${passo},
          estado = ${novo.estado},
          estado_antes_pausa = null,
          fase_iniciada_em = ${relogioAnterior ? (relogioAnterior.fase_iniciada_em as string) : tx`now()`},
          pausa_acumulada_s = ${relogioAnterior ? Number(relogioAnterior.pausa_acumulada_s) : 0},
          ajuste_tempo_s = ${relogioAnterior ? Number(relogioAnterior.ajuste_tempo_s) : 0},
          pausada_desde = null,
          reaberta_em = ${r.efeitos.reaberta ? tx`now()` : null},
          versao = versao + 1
        where id = ${mesa.id}`;
    } else if (acao.tipo === "pausar") {
      await tx`
        update mesa set estado = 'pausada', estado_antes_pausa = ${novo.estadoAntesPausa},
          pausada_desde = now(), versao = versao + 1
        where id = ${mesa.id}`;
    } else if (acao.tipo === "retomar") {
      await tx`
        update mesa set estado = ${novo.estado}, estado_antes_pausa = null,
          pausa_acumulada_s = pausa_acumulada_s
            + coalesce(extract(epoch from now() - pausada_desde)::int, 0),
          pausada_desde = null, versao = versao + 1
        where id = ${mesa.id}`;
    } else {
      await tx`update mesa set estado = ${novo.estado}, versao = versao + 1 where id = ${mesa.id}`;
    }

    const detalhes: Record<string, unknown> = { de: mesa.fase_atual, para: novo.fase };
    if (acao.tipo === "avancar" || acao.tipo === "forcar" || r.efeitos.avancoAutomatico) {
      detalhes.relogioAnterior = {
        fase_iniciada_em: mesa.fase_iniciada_em.toISOString(),
        pausa_acumulada_s: mesa.pausa_acumulada_s,
        ajuste_tempo_s: mesa.ajuste_tempo_s,
        passo_atual: mesa.passo_atual,
      };
    }
    if (r.efeitos.avancoAutomatico) {
      await registrar(tx, mesa.evento_id, mesa.id, "concluir_fase", autor, { fase: mesa.fase_atual });
      await registrar(tx, mesa.evento_id, mesa.id, "avancar", { perfil: "sistema", nome: "Liberação automática" }, detalhes);
    } else {
      await registrar(tx, mesa.evento_id, mesa.id, NOME_ACAO[acao.tipo], autor, detalhes);
    }
    mesaAfetada = mesa;
    return { ok: true };
  });
  if (resultado.ok && mesaAfetada) await avisarMudanca(mesaAfetada);
  return resultado;
}

// Ações da mesa ---------------------------------------------------------------

/** "Concluímos a fase" (RN01, RN02, RN03). */
export async function concluirFase(sql: Sql, mesaId: string): Promise<Resultado> {
  return aplicarAcaoMesa(
    sql,
    mesaId,
    async (mesa, tx) => {
      const evento = await eventoPorId(tx, mesa.evento_id);
      const roteiro = await roteiroDoEvento(tx, mesa.evento_id);
      const avaliacao = avaliacaoDaFase(roteiro, mesa.fase_atual, await contextoDaMesa(tx, mesa));
      if (!avaliacao.ok) return recusa(avaliacao.falta ?? "Os critérios da fase ainda não foram atendidos.");
      return { tipo: "concluir_fase", criteriosOk: true, modo: evento?.modo_liberacao ?? "manual" };
    },
    { perfil: "mesa", nome: "" },
  );
}

async function passoDaMesa(tx: Sql, mesa: LinhaMesa, passoId: string) {
  const roteiro = await roteiroDoEvento(tx, mesa.evento_id);
  const passos = roteiro.passosPorFase.get(mesa.fase_atual) ?? [];
  return { passos, passo: passos.find((p) => p.id === passoId) ?? null };
}

/** "Passo concluído": só vale para passo da fase atual, com o critério atendido. */
export async function concluirPasso(sql: Sql, mesaId: string, passoId: string): Promise<Resultado> {
  let mesaAfetada: LinhaMesa | null = null;
  const r = await sql.begin(async (txBruta): Promise<Resultado> => {
    const tx = txBruta as unknown as Sql;
    const mesa = await travarMesa(tx, mesaId);
    if (!mesa) return recusa("Mesa não encontrada.", 404);
    if (mesa.estado === "pausada") return recusa("A mesa está pausada.");
    const { passos, passo } = await passoDaMesa(tx, mesa, passoId);
    if (!passo) return recusa("Este passo não é da fase liberada para a mesa.", 403);
    const ctx = await contextoDaMesa(tx, mesa);
    const concluidos = new Set(ctx.concluidos);
    const avaliacao = avaliarPasso(
      { id: passo.id, ordem: passo.ordem, tipo: passo.tipo_atividade, criterio: passo.criterio, config: passo.config },
      ctx,
    );
    if (!avaliacao.ok) return recusa(avaliacao.falta ?? "O critério do passo ainda não foi atendido.");
    await tx`
      insert into passo_concluido (mesa_id, passo_id) values (${mesa.id}, ${passo.id})
      on conflict do nothing`;
    concluidos.add(passo.id);
    const proximo = passos.find((p) => p.ordem > passo.ordem && !concluidos.has(p.id));
    const passoAtual = proximo ? proximo.ordem : passos[passos.length - 1].ordem;
    await tx`update mesa set passo_atual = ${passoAtual}, versao = versao + 1 where id = ${mesa.id}`;
    mesaAfetada = mesa;
    return { ok: true };
  });
  if (r.ok && mesaAfetada) await avisarMudanca(mesaAfetada);
  return r;
}

/** Abre um passo já liberado da fase atual (concluído ou o próximo a fazer). */
export async function irParaPasso(sql: Sql, mesaId: string, ordem: number): Promise<Resultado> {
  let mesaAfetada: LinhaMesa | null = null;
  const r = await sql.begin(async (txBruta): Promise<Resultado> => {
    const tx = txBruta as unknown as Sql;
    const mesa = await travarMesa(tx, mesaId);
    if (!mesa) return recusa("Mesa não encontrada.", 404);
    const roteiro = await roteiroDoEvento(tx, mesa.evento_id);
    const passos = roteiro.passosPorFase.get(mesa.fase_atual) ?? [];
    const concluidos = await passosConcluidos(tx, mesa.id);
    const alvo = passos.find((p) => p.ordem === ordem);
    if (!alvo) return recusa("Este passo não existe na fase atual.", 404);
    const primeiroAberto = passos.find((p) => !concluidos.has(p.id))?.ordem ?? Infinity;
    if (ordem > primeiroAberto) return recusa("Concluam os passos anteriores primeiro.", 403);
    await tx`update mesa set passo_atual = ${ordem}, versao = versao + 1 where id = ${mesa.id}`;
    mesaAfetada = mesa;
    return { ok: true };
  });
  if (r.ok && mesaAfetada) await avisarMudanca(mesaAfetada);
  return r;
}

/** "Pedir ajuda" e "Cancelar pedido". */
export async function pedirAjuda(sql: Sql, mesaId: string, abrir: boolean): Promise<Resultado> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) return recusa("Mesa não encontrada.", 404);
  if (abrir) {
    await sql`
      insert into chamado (mesa_id, fase, passo) values (${mesa.id}, ${mesa.fase_atual}, ${mesa.passo_atual})
      on conflict (mesa_id) where estado = 'aberto' do nothing`;
    await registrar(sql, mesa.evento_id, mesa.id, "pedir_ajuda", { perfil: "mesa", nome: "" }, {
      fase: mesa.fase_atual,
      passo: mesa.passo_atual,
    });
  } else {
    const cancelados = await sql`
      update chamado set estado = 'cancelado' where mesa_id = ${mesa.id} and estado = 'aberto'
      returning id`;
    if (cancelados.length) {
      await registrar(sql, mesa.evento_id, mesa.id, "cancelar_ajuda", { perfil: "mesa", nome: "" });
    }
  }
  await avisarMudanca(mesa, "chamado");
  return { ok: true };
}

// Ações do admin sobre uma mesa ------------------------------------------------

export async function acaoDeFase(
  sql: Sql,
  mesaId: string,
  tipo: "avancar" | "forcar" | "voltar" | "desfazer_avanco" | "pausar" | "retomar",
  autor: Autor,
): Promise<Resultado> {
  return aplicarAcaoMesa(sql, mesaId, async () => ({ tipo }) as AcaoMesa, autor);
}

export async function ajustarTempo(sql: Sql, mesaId: string, minutos: number, autor: Autor): Promise<Resultado> {
  if (!Number.isInteger(minutos) || minutos === 0 || Math.abs(minutos) > 60) {
    return recusa("Informe de 1 a 60 minutos, para mais ou para menos.", 400);
  }
  const [mesa] = await sql<{ id: string; evento_id: string }[]>`
    update mesa set ajuste_tempo_s = ajuste_tempo_s + ${minutos * 60}, versao = versao + 1
    where id = ${mesaId} returning id, evento_id`;
  if (!mesa) return recusa("Mesa não encontrada.", 404);
  await registrar(sql, mesa.evento_id, mesa.id, "ajustar_tempo", autor, { minutos });
  await avisarMudanca(mesa);
  return { ok: true };
}

export async function enviarAviso(
  sql: Sql,
  eventoId: string,
  mesaId: string | null,
  texto: string,
  autor: Autor,
): Promise<Resultado> {
  const limpo = texto.trim();
  if (!limpo) return recusa("Escreva o aviso antes de enviar.", 400);
  if (limpo.length > 280) return recusa("O aviso pode ter até 280 caracteres.", 400);
  await sql`
    insert into aviso (evento_id, mesa_id, texto, autor)
    values (${eventoId}, ${mesaId}, ${limpo}, ${autor.nome || autor.perfil})`;
  await registrar(sql, eventoId, mesaId, "aviso", autor, { texto: limpo });
  if (mesaId) await emitir([canalMesa(mesaId), canalAdmin(eventoId)], { tipo: "aviso", mesaId });
  else await emitir([canalEvento(eventoId), canalAdmin(eventoId)], { tipo: "aviso" });
  return { ok: true };
}

export async function atenderChamado(sql: Sql, chamadoId: string, autor: Autor): Promise<Resultado> {
  const [c] = await sql<{ mesa_id: string; evento_id: string }[]>`
    update chamado c set estado = 'atendido', atendido_por = ${autor.nome || autor.perfil},
      atendido_em = now()
    from mesa m
    where c.id = ${chamadoId} and c.estado = 'aberto' and m.id = c.mesa_id
    returning c.mesa_id, m.evento_id`;
  if (!c) return recusa("Este chamado já foi atendido ou cancelado.");
  await registrar(sql, c.evento_id, c.mesa_id, "atender_chamado", autor);
  await avisarMudanca({ id: c.mesa_id, evento_id: c.evento_id }, "chamado");
  return { ok: true };
}

// Ações do admin sobre todas as mesas ------------------------------------------

export interface ResumoLote {
  afetadas: number;
  recusadas: { mesa: string; motivo: string }[];
}

async function emLote(
  sql: Sql,
  mesas: LinhaMesa[],
  executar: (m: LinhaMesa) => Promise<Resultado>,
): Promise<ResumoLote> {
  const resumo: ResumoLote = { afetadas: 0, recusadas: [] };
  for (const m of mesas) {
    const r = await executar(m);
    if (r.ok) resumo.afetadas++;
    else resumo.recusadas.push({ mesa: m.nome, motivo: r.motivo });
  }
  return resumo;
}

/** "Avançar as N mesas prontas": libera todas as mesas que declararam pronta. */
export async function avancarProntas(sql: Sql, eventoId: string, autor: Autor): Promise<Resultado<ResumoLote>> {
  const mesas = (await mesasDoEvento(sql, eventoId)).filter(
    (m) => m.estado === "pronta" && m.fase_atual < ULTIMA_FASE,
  );
  const resumo = await emLote(sql, mesas, (m) => acaoDeFase(sql, m.id, "avancar", autor));
  return { ok: true, dados: resumo };
}

/**
 * "Avançar todas": só as mesas que estão na fase de referência mudam (seção 5).
 * As prontas avançam; as demais são forçadas e o registro mostra isso.
 * Depois, a fase de referência passa para a seguinte.
 */
export async function avancarTodas(sql: Sql, eventoId: string, autor: Autor): Promise<Resultado<ResumoLote>> {
  const evento = await eventoPorId(sql, eventoId);
  if (!evento) return recusa("Evento não encontrado.", 404);
  const ref = evento.fase_referencia;
  if (ref >= ULTIMA_FASE) return recusa("A fase de referência já é a última.");
  const mesas = (await mesasDoEvento(sql, eventoId)).filter((m) => m.fase_atual === ref);
  const resumo = await emLote(sql, mesas, (m) =>
    acaoDeFase(sql, m.id, m.estado === "pronta" ? "avancar" : "forcar", autor),
  );
  await sql`update evento set fase_referencia = ${ref + 1} where id = ${eventoId}`;
  await registrar(sql, eventoId, null, "avancar_todas", autor, { de: ref, para: ref + 1, ...resumo });
  await emitir([canalEvento(eventoId), canalAdmin(eventoId)], { tipo: "evento" });
  return { ok: true, dados: resumo };
}

/** Pausa geral (intervalo): pausa todas as mesas e mostra a contagem regressiva. */
export async function pausarTodas(
  sql: Sql,
  eventoId: string,
  minutos: number | null,
  autor: Autor,
): Promise<Resultado<ResumoLote>> {
  const evento = await eventoPorId(sql, eventoId);
  if (!evento) return recusa("Evento não encontrado.", 404);
  const duracao = minutos ?? evento.duracao_intervalo_min;
  if (!Number.isInteger(duracao) || duracao < 1 || duracao > 120) {
    return recusa("Informe de 1 a 120 minutos de pausa.", 400);
  }
  const mesas = (await mesasDoEvento(sql, eventoId)).filter((m) => m.estado !== "pausada");
  const resumo = await emLote(sql, mesas, (m) => acaoDeFase(sql, m.id, "pausar", autor));
  await sql`
    update evento set pausa_geral_desde = now(),
      pausa_geral_ate = now() + make_interval(mins => ${duracao})
    where id = ${eventoId}`;
  await registrar(sql, eventoId, null, "pausar_todas", autor, { minutos: duracao });
  await emitir([canalEvento(eventoId), canalAdmin(eventoId)], { tipo: "evento" });
  return { ok: true, dados: resumo };
}

export async function retomarTodas(sql: Sql, eventoId: string, autor: Autor): Promise<Resultado<ResumoLote>> {
  const mesas = (await mesasDoEvento(sql, eventoId)).filter((m) => m.estado === "pausada");
  const resumo = await emLote(sql, mesas, (m) => acaoDeFase(sql, m.id, "retomar", autor));
  await sql`update evento set pausa_geral_desde = null, pausa_geral_ate = null where id = ${eventoId}`;
  await registrar(sql, eventoId, null, "retomar_todas", autor);
  await emitir([canalEvento(eventoId), canalAdmin(eventoId)], { tipo: "evento" });
  return { ok: true, dados: resumo };
}

export async function ajustarTempoTodas(
  sql: Sql,
  eventoId: string,
  minutos: number,
  autor: Autor,
): Promise<Resultado<ResumoLote>> {
  const mesas = await mesasDoEvento(sql, eventoId);
  const resumo = await emLote(sql, mesas, (m) => ajustarTempo(sql, m.id, minutos, autor));
  return { ok: true, dados: resumo };
}

// Evento --------------------------------------------------------------------------

export async function configurarEvento(
  sql: Sql,
  eventoId: string,
  mudancas: { modoLiberacao?: "manual" | "automatico"; faseReferencia?: number; iniciar?: boolean },
  autor: Autor,
): Promise<Resultado> {
  const evento = await eventoPorId(sql, eventoId);
  if (!evento) return recusa("Evento não encontrado.", 404);
  if (mudancas.modoLiberacao) {
    await sql`update evento set modo_liberacao = ${mudancas.modoLiberacao} where id = ${eventoId}`;
    await registrar(sql, eventoId, null, "modo_liberacao", autor, { modo: mudancas.modoLiberacao });
  }
  if (mudancas.faseReferencia !== undefined) {
    const f = mudancas.faseReferencia;
    if (!Number.isInteger(f) || f < 0 || f > ULTIMA_FASE) return recusa("Fase de referência inválida.", 400);
    await sql`update evento set fase_referencia = ${f} where id = ${eventoId}`;
    await registrar(sql, eventoId, null, "fase_referencia", autor, { fase: f });
  }
  if (mudancas.iniciar) {
    if (evento.iniciado_em) return recusa("O evento já foi iniciado.");
    await sql.begin(async (tx) => {
      await tx`update evento set iniciado_em = now() where id = ${eventoId}`;
      // As mesas ainda na Fase 0 começam a contar o tempo junto com o evento.
      await tx`
        update mesa set fase_iniciada_em = now(), pausa_acumulada_s = 0, versao = versao + 1
        where evento_id = ${eventoId} and fase_atual = 0 and estado <> 'pausada'`;
    });
    await registrar(sql, eventoId, null, "iniciar_evento", autor);
  }
  await emitir([canalEvento(eventoId), canalAdmin(eventoId)], { tipo: "evento" });
  return { ok: true };
}
