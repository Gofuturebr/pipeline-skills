import type { Sql } from "./db";
import { eventoPorId, iso, relogioDaMesa, roteiroDoEvento, type LinhaMesa } from "./consultas";
import { emitir } from "./sinais";
import type { Resultado } from "./acoes";
import { DEFINICAO_PAPEIS, nomeDoPapel, type Papel } from "@/lib/jornada";
import { LIMITE_CONTRIBUICAO, limparContribuicao, limparNome } from "@/lib/participante";
import { lerFicha } from "@/lib/processo";
import { canalAdmin, canalMesa } from "@/lib/sinais";
import type { EstadoCelularApi } from "@/lib/tipos-api";

// Celular do participante: entrada só com o primeiro nome, sinal de vida e
// contribuições. O token fica num cookie do navegador e identifica a pessoa.

/** Um celular conta como conectado se mandou sinal nos últimos 45 segundos. */
export const JANELA_CONECTADO_S = 45;

/** Quantas contribuições pendentes uma pessoa pode ter ao mesmo tempo. */
export const LIMITE_PENDENTES_POR_PESSOA = 20;

export interface LinhaParticipante {
  id: string;
  mesa_id: string;
  primeiro_nome: string;
}

/** Nome do cookie do celular. Um por mesa, para não misturar mesas no mesmo aparelho. */
export const cookieParticipante = (codigo: string) => `mesa_p_${codigo}`;

export async function entrarParticipante(
  sql: Sql,
  mesa: LinhaMesa,
  nome: string,
): Promise<Resultado<{ token: string; nome: string }>> {
  const limpo = limparNome(nome);
  if (!limpo) return { ok: false, motivo: "Digite seu primeiro nome.", status: 400 };
  const [p] = await sql<{ token: string }[]>`
    insert into participante (mesa_id, primeiro_nome) values (${mesa.id}, ${limpo}) returning token`;
  await emitir([canalMesa(mesa.id), canalAdmin(mesa.evento_id)], { tipo: "participante", mesaId: mesa.id });
  return { ok: true, dados: { token: p.token, nome: limpo } };
}

/** Acha a pessoa pelo token e registra o sinal de vida. */
export async function participantePorToken(
  sql: Sql,
  mesaId: string,
  token: string | undefined,
): Promise<LinhaParticipante | null> {
  if (!token || !/^[0-9a-f]{48}$/.test(token)) return null;
  const [p] = await sql<LinhaParticipante[]>`
    update participante set ultimo_sinal_em = now()
    where token = ${token} and mesa_id = ${mesaId}
    returning id, mesa_id, primeiro_nome`;
  return p ?? null;
}

export async function contribuir(
  sql: Sql,
  mesa: LinhaMesa,
  participante: LinhaParticipante,
  texto: string,
): Promise<Resultado> {
  const limpo = limparContribuicao(texto);
  if (!limpo) return { ok: false, motivo: "Escreva algo antes de enviar.", status: 400 };
  if (limpo.length > LIMITE_CONTRIBUICAO) {
    return { ok: false, motivo: `Cada envio pode ter até ${LIMITE_CONTRIBUICAO} caracteres.`, status: 400 };
  }
  if (mesa.estado === "pausada") return { ok: false, motivo: "A mesa está pausada. Envie quando ela voltar.", status: 409 };
  const [fase] = await sql<{ rotulo_contribuicao: string }[]>`
    select rotulo_contribuicao from fase where evento_id = ${mesa.evento_id} and ordem = ${mesa.fase_atual}`;
  if (!fase?.rotulo_contribuicao) {
    return { ok: false, motivo: "Nesta fase a mesa não está recebendo envios pelo celular.", status: 409 };
  }
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from contribuicao
    where participante_id = ${participante.id} and estado = 'pendente'`;
  if (n >= LIMITE_PENDENTES_POR_PESSOA) {
    return { ok: false, motivo: "A mesa ainda não leu o que você enviou. Espere um pouco antes de mandar mais.", status: 429 };
  }
  await sql`
    insert into contribuicao (mesa_id, participante_id, fase, passo, texto)
    values (${mesa.id}, ${participante.id}, ${mesa.fase_atual}, ${mesa.passo_atual}, ${limpo})`;
  await emitir([canalMesa(mesa.id)], { tipo: "contribuicao", mesaId: mesa.id });
  return { ok: true };
}

/** O que o celular mostra: fase, passo, papel e, quando a fase pede, o campo de envio. */
export async function montarEstadoCelular(
  sql: Sql,
  mesa: LinhaMesa,
  participante: LinhaParticipante | null,
): Promise<EstadoCelularApi> {
  const [evento, roteiro, papeis, contagem, avisos, processos, pergunta] = await Promise.all([
    eventoPorId(sql, mesa.evento_id),
    roteiroDoEvento(sql, mesa.evento_id),
    participante
      ? sql<{ papel: Papel; nome: string; participante_id: string | null }[]>`
          select papel, nome, participante_id from papel_mesa where mesa_id = ${mesa.id}`
      : Promise.resolve([]),
    participante
      ? sql<{ enviadas: number; aceitas: number }[]>`
          select count(*)::int as enviadas, count(*) filter (where estado = 'aceita')::int as aceitas
          from contribuicao where participante_id = ${participante.id}`
      : Promise.resolve([{ enviadas: 0, aceitas: 0 }]),
    sql<{ id: string; texto: string; criado_em: Date; mesa_id: string | null }[]>`
      select id, texto, criado_em, mesa_id from aviso
      where evento_id = ${mesa.evento_id} and (mesa_id is null or mesa_id = ${mesa.id})
        and criado_em > now() - interval '60 seconds'
      order by criado_em desc limit 1`,
    mesa.processo_id && mesa.fase_atual === 1
      ? sql<{ ficha: unknown }[]>`select ficha from processo where id = ${mesa.processo_id}`
      : Promise.resolve([] as { ficha: unknown }[]),
    // Na Fase 2, a pergunta da IA que está esperando resposta.
    mesa.fase_atual === 2
      ? sql<{ tipo: string; texto: string }[]>`
          select tipo, texto from mensagem
          where mesa_id = ${mesa.id} and fase = 2 and tipo in ('pergunta', 'resposta')
          order by criado_em desc, id desc limit 1`
      : Promise.resolve([] as { tipo: string; texto: string }[]),
  ]);
  if (!evento) throw new Error("Evento da mesa não encontrado");

  const fase = roteiro.fases.find((f) => f.ordem === mesa.fase_atual);
  const passos = roteiro.passosPorFase.get(mesa.fase_atual) ?? [];
  const passo = passos.find((p) => p.ordem === mesa.passo_atual) ?? null;

  // O papel é da pessoa quando ela foi escolhida da lista ou quando o nome digitado é igual ao dela.
  const meus = participante
    ? papeis.filter(
        (p) =>
          p.participante_id === participante.id ||
          (!p.participante_id && p.nome.trim().toLowerCase() === participante.primeiro_nome.toLowerCase()),
      )
    : [];

  const ficha = processos[0] ? lerFicha(processos[0].ficha) : null;

  return {
    agora: new Date().toISOString(),
    evento: { id: evento.id, pausaGeralAte: iso(evento.pausa_geral_ate) },
    mesa: {
      id: mesa.id,
      nome: mesa.nome,
      faseAtual: mesa.fase_atual,
      faseNome: fase?.nome ?? "",
      passoAtual: mesa.passo_atual,
      totalPassos: passos.length,
      estado: mesa.estado,
      relogio: relogioDaMesa(mesa, fase?.duracao_min ?? 0),
      passo: passo ? { instrucao: passo.instrucao, papelNome: nomeDoPapel(passo.papel) } : null,
    },
    participante: participante
      ? {
          nome: participante.primeiro_nome,
          papeis: DEFINICAO_PAPEIS.filter((d) => meus.some((m) => m.papel === d.papel)).map((d) => ({
            papel: d.papel,
            nome: d.nome,
            descricao: d.descricao,
          })),
        }
      : null,
    contribuicao: fase?.rotulo_contribuicao
      ? { rotulo: fase.rotulo_contribuicao, enviadas: contagem[0].enviadas, aceitas: contagem[0].aceitas }
      : null,
    ficha: ficha ? { objetivo: ficha.objetivo ?? "", resultadoEsperado: ficha.resultadoEsperado ?? "" } : null,
    perguntaAtual: pergunta[0]?.tipo === "pergunta" ? pergunta[0].texto : null,
    avisos: avisos.map((a) => ({
      id: a.id,
      texto: a.texto,
      criadoEm: iso(a.criado_em) as string,
      paraTodas: a.mesa_id === null,
    })),
  };
}
