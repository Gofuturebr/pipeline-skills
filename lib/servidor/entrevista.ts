import type { Sql } from "./db";
import type Anthropic from "@anthropic-ai/sdk";
import { mesaPorId, type LinhaMesa } from "./consultas";
import { avisarMudanca, recusa, registrar, type Resultado } from "./acoes";
import { lerArquivo, salvarArquivo } from "./arquivos";
import { contextoDoProcesso } from "./processo";
import { mensagemDeFalhaDaIA, transmitir } from "@/lib/ia/cliente";
import { lerCampoParcial } from "@/lib/ia/json-parcial";
import { blocoDoProcesso } from "@/lib/ia/prompts/comum";
import { ESQUEMA_ENTREVISTA, SISTEMA_ENTREVISTA, type RespostaEntrevista } from "@/lib/ia/prompts/entrevista";
import {
  PERGUNTAS_FINAIS,
  SISTEMA_CORRIGIR_SKILL,
  SISTEMA_ESCREVER_SKILL,
  completarSecoes,
  nomeDaPasta,
} from "@/lib/ia/prompts/skill";
import { MINIMO_PERGUNTAS, TEMAS_ENTREVISTA } from "@/lib/jornada";
import { acharSensivel, mascararSensivel, mensagemSensivel } from "@/lib/sensivel";
import {
  FASE_ENTREVISTA,
  faltaParaEscrever,
  garantirEntrevista,
  mensagensDaEntrevista,
  type LinhaMensagem,
} from "./entrevista-dados";

// Fase 2: entrevista, uma pergunta por vez, e o SKILL.md (RN07).

const TRAVA_PERGUNTA_S = 90;
const TRAVA_ARQUIVO_S = 240;
const LIMITE_RESPOSTA = 4000;

/** Pega a trava da IA para a mesa. Devolve falso se outra chamada está em curso. */
async function travar(sql: Sql, mesaId: string, segundos: number): Promise<boolean> {
  await sql`insert into entrevista (mesa_id) values (${mesaId}) on conflict do nothing`;
  const r = await sql`
    update entrevista set ocupada_ate = now() + make_interval(secs => ${segundos})
    where mesa_id = ${mesaId} and (ocupada_ate is null or ocupada_ate < now())
    returning mesa_id`;
  return r.length > 0;
}

async function destravar(sql: Sql, mesaId: string) {
  await sql`update entrevista set ocupada_ate = null where mesa_id = ${mesaId}`;
}

function conferirMesa(mesa: LinhaMesa): Resultado | null {
  if (mesa.fase_atual !== FASE_ENTREVISTA) return recusa("A entrevista é da Fase 2.", 403);
  if (mesa.estado === "pausada") return recusa("A mesa está pausada.");
  if (mesa.final) return recusa("A skill já foi marcada como final.");
  return null;
}

async function contribuicoesAceitas(sql: Sql, mesaId: string): Promise<string[]> {
  const linhas = await sql<{ texto: string }[]>`
    select texto from contribuicao where mesa_id = ${mesaId} and estado = 'aceita' and fase < ${FASE_ENTREVISTA}
    order by criado_em`;
  return linhas.map((l) => l.texto);
}

async function aberturaDaConversa(sql: Sql, mesa: LinhaMesa): Promise<string> {
  const processo = await contextoDoProcesso(sql, mesa);
  const contribuicoes = await contribuicoesAceitas(sql, mesa.id);
  const extra = contribuicoes.length
    ? `\n\nDúvidas e casos que o grupo levantou na Fase 1:\n${contribuicoes.map((c) => `- ${c}`).join("\n")}`
    : "";
  return `${blocoDoProcesso(processo)}${extra}`;
}

/**
 * Um turno da entrevista: guarda a resposta (se houver) e pede a próxima pergunta
 * à IA, que chega aos poucos em aoTexto.
 */
export async function turnoDaEntrevista(
  sql: Sql,
  mesaId: string,
  resposta: string | undefined,
  aoTexto: (delta: string) => void,
): Promise<Resultado> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) return recusa("Mesa não encontrada.", 404);
  const problema = conferirMesa(mesa);
  if (problema) return problema;
  const e = await garantirEntrevista(sql, mesa.id);
  if (e.encerrada_em) return recusa("A entrevista já foi encerrada.");

  const texto = resposta?.trim();
  if (texto) {
    if (texto.length > LIMITE_RESPOSTA) return recusa("A resposta ficou longa demais. Resumam um pouco.", 400);
    const achado = acharSensivel(texto);
    if (achado) return recusa(mensagemSensivel(achado, "enviar"), 400);
  }

  if (!(await travar(sql, mesa.id, TRAVA_PERGUNTA_S))) {
    return recusa("A IA já está escrevendo. Esperem a pergunta aparecer.");
  }
  try {
    const msgs = await mensagensDaEntrevista(sql, mesa.id);
    const ultima = msgs[msgs.length - 1];
    const pendente = ultima?.tipo === "pergunta";
    if (texto) {
      if (!pendente) return recusa("Não há pergunta esperando resposta.");
      await sql.begin(async (tx) => {
        await tx`
          insert into mensagem (mesa_id, autor, texto, fase, passo, tipo, meta)
          values (${mesa.id}, 'mesa', ${texto}, ${FASE_ENTREVISTA}, ${mesa.passo_atual}, 'resposta',
                  ${tx.json({ pergunta_id: ultima.id })})`;
        await tx`update entrevista set n_perguntas = n_perguntas + 1 where mesa_id = ${mesa.id}`;
      });
      msgs.push({ id: "", autor: "mesa", texto, tipo: "resposta", meta: {} });
    } else if (pendente) {
      // Já existe uma pergunta esperando: nada a fazer.
      return { ok: true };
    }

    // Conversa para a IA: o contexto, depois pergunta (da IA) e resposta (da mesa).
    const mensagens: Anthropic.Beta.BetaMessageParam[] = [];
    const abertura = await aberturaDaConversa(sql, mesa);
    let blocoUsuario = `${abertura}\n\nComecem a entrevista: façam a primeira pergunta.`;
    for (const m of msgs) {
      if (m.tipo === "pergunta") {
        mensagens.push({ role: "user", content: blocoUsuario });
        mensagens.push({
          role: "assistant",
          content: JSON.stringify({
            temas_cobertos: m.meta.temas_cobertos ?? [],
            tema_da_pergunta: m.meta.tema ?? "gatilho",
            pergunta: m.texto,
          }),
        });
        blocoUsuario = "";
      } else {
        blocoUsuario = `Resposta do grupo:\n${m.texto}`;
      }
    }
    mensagens.push({ role: "user", content: blocoUsuario || "Façam a próxima pergunta." });

    let bruto = "";
    let mostrado = "";
    const resultado = await transmitir(
      {
        tarefa: "entrevista",
        sistema: SISTEMA_ENTREVISTA,
        mensagens,
        esforco: "low",
        maxTokens: 8000,
        esquema: ESQUEMA_ENTREVISTA as unknown as Record<string, unknown>,
      },
      (delta) => {
        bruto += delta;
        const pergunta = lerCampoParcial(bruto, "pergunta");
        if (pergunta && pergunta.length > mostrado.length) {
          aoTexto(pergunta.slice(mostrado.length));
          mostrado = pergunta;
        }
      },
    );
    if (resultado.parada === "recusa") {
      return recusa("A IA não conseguiu fazer a próxima pergunta. Reformulem a última resposta e tentem de novo.", 502);
    }
    let dados: RespostaEntrevista;
    try {
      dados = JSON.parse(resultado.texto) as RespostaEntrevista;
    } catch {
      return recusa("A resposta não chegou inteira. O que vocês escreveram está salvo. Tentem de novo.", 502);
    }
    const pergunta = mascararSensivel(dados.pergunta.trim());
    const validos = new Set<string>(TEMAS_ENTREVISTA.map((t) => t.chave));
    const cobertos = (dados.temas_cobertos ?? []).filter((t) => validos.has(t));
    await sql.begin(async (tx) => {
      await tx`
        insert into mensagem (mesa_id, autor, texto, fase, passo, tipo, meta)
        values (${mesa.id}, 'ia', ${pergunta}, ${FASE_ENTREVISTA}, ${mesa.passo_atual}, 'pergunta',
                ${tx.json({ tema: dados.tema_da_pergunta, temas_cobertos: cobertos })})`;
      // Tema coberto continua coberto: a cobertura só cresce.
      const novos = Object.fromEntries(cobertos.map((t) => [t, true]));
      await tx`update entrevista set temas = temas || ${tx.json(novos)} where mesa_id = ${mesa.id}`;
    });
    return { ok: true };
  } catch (e) {
    console.error(e);
    return recusa(mensagemDeFalhaDaIA(e), 502);
  } finally {
    await destravar(sql, mesa.id);
    await avisarMudanca(mesa);
  }
}

/** "Encerrar entrevista": só com 8 perguntas respondidas e os 8 temas cobertos (RN07). */
export async function encerrarEntrevista(sql: Sql, mesaId: string): Promise<Resultado> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) return recusa("Mesa não encontrada.", 404);
  const problema = conferirMesa(mesa);
  if (problema) return problema;
  const e = await garantirEntrevista(sql, mesa.id);
  const falta = faltaParaEscrever(e);
  if (falta) return recusa(`${falta} antes de encerrar a entrevista.`);
  await sql`update entrevista set encerrada_em = coalesce(encerrada_em, now()) where mesa_id = ${mesa.id}`;
  await registrar(sql, mesa.evento_id, mesa.id, "encerrar_entrevista", { perfil: "mesa", nome: "" }, {
    perguntas: e.n_perguntas,
  });
  await avisarMudanca(mesa);
  return { ok: true };
}

function transcricao(msgs: LinhaMensagem[]): string {
  const linhas: string[] = [];
  for (const m of msgs) linhas.push(m.tipo === "pergunta" ? `Pergunta: ${m.texto}` : `Resposta do grupo: ${m.texto}`);
  return linhas.join("\n\n");
}

async function escreverSkill(
  sql: Sql,
  mesa: LinhaMesa,
  sistema: string,
  pedido: string,
  aoTexto: (delta: string) => void,
): Promise<Resultado> {
  const resultado = await transmitir(
    { tarefa: "skill", sistema, mensagens: [{ role: "user", content: pedido }], esforco: "medium", maxTokens: 32000 },
    aoTexto,
  );
  if (resultado.parada === "recusa") return recusa("A IA não conseguiu escrever o arquivo. Tentem de novo.", 502);
  if (resultado.parada === "limite") return recusa("O arquivo ficou longo demais e não terminou. Tentem de novo.", 502);
  const conteudo = mascararSensivel(completarSecoes(resultado.texto));
  const salvo = await sql.begin(async (tx) => {
    const t = tx as unknown as Sql;
    const r = await salvarArquivo(t, mesa, "SKILL.md", conteudo, { autor: "ia" });
    if (r.ok && !mesa.nome_skill) {
      await t`update mesa set nome_skill = ${nomeDaPasta(conteudo)}, versao = versao + 1 where id = ${mesa.id}`;
    }
    return r;
  });
  return salvo.ok ? { ok: true } : salvo;
}

/** A IA escreve o SKILL.md. Recusa antes de 8 perguntas e dos 8 temas (RN07). */
export async function gerarSkill(sql: Sql, mesaId: string, aoTexto: (delta: string) => void): Promise<Resultado> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) return recusa("Mesa não encontrada.", 404);
  const problema = conferirMesa(mesa);
  if (problema) return problema;
  const e = await garantirEntrevista(sql, mesa.id);
  const falta = faltaParaEscrever(e);
  if (falta) {
    return recusa(
      `A IA só escreve o SKILL.md depois de ${MINIMO_PERGUNTAS} perguntas respondidas e dos 8 temas cobertos. ${falta}.`,
      409,
    );
  }
  if (!(await travar(sql, mesa.id, TRAVA_ARQUIVO_S))) return recusa("A IA já está escrevendo. Esperem terminar.");
  try {
    await sql`update entrevista set encerrada_em = coalesce(encerrada_em, now()) where mesa_id = ${mesa.id}`;
    const msgs = await mensagensDaEntrevista(sql, mesa.id);
    const pedido = `${await aberturaDaConversa(sql, mesa)}

Entrevista com o grupo:

${transcricao(msgs)}

Escrevam o SKILL.md.`;
    const r = await escreverSkill(sql, mesa, SISTEMA_ESCREVER_SKILL, pedido, aoTexto);
    if (r.ok) {
      await registrar(sql, mesa.evento_id, mesa.id, "gerar_skill", { perfil: "mesa", nome: "" });
    }
    return r;
  } catch (e) {
    console.error(e);
    return recusa(mensagemDeFalhaDaIA(e), 502);
  } finally {
    await destravar(sql, mesa.id);
    await avisarMudanca(mesa);
  }
}

/** A IA corrige o SKILL.md com as respostas às duas perguntas finais. */
export async function corrigirSkill(
  sql: Sql,
  mesaId: string,
  respostas: { errou: string; esqueceu: string },
  aoTexto: (delta: string) => void,
): Promise<Resultado> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) return recusa("Mesa não encontrada.", 404);
  const problema = conferirMesa(mesa);
  if (problema) return problema;
  const errou = respostas.errou.trim();
  const esqueceu = respostas.esqueceu.trim();
  if (!errou && !esqueceu) return recusa("Respondam pelo menos uma das duas perguntas.", 400);
  for (const t of [errou, esqueceu]) {
    const achado = acharSensivel(t);
    if (achado) return recusa(mensagemSensivel(achado, "enviar"), 400);
  }
  const atual = await lerArquivo(sql, mesa.id, "SKILL.md");
  if (!atual) return recusa("A IA ainda não escreveu o SKILL.md.");
  if (!(await travar(sql, mesa.id, TRAVA_ARQUIVO_S))) return recusa("A IA já está escrevendo. Esperem terminar.");
  try {
    await sql`
      update entrevista set respostas_finais = ${sql.json({ errou, esqueceu })} where mesa_id = ${mesa.id}`;
    const pedido = `Arquivo atual:

${atual.conteudo}

${PERGUNTAS_FINAIS[0]}
${errou || "(o grupo não respondeu)"}

${PERGUNTAS_FINAIS[1]}
${esqueceu || "(o grupo não respondeu)"}

Corrijam o SKILL.md.`;
    const r = await escreverSkill(sql, mesa, SISTEMA_CORRIGIR_SKILL, pedido, aoTexto);
    if (r.ok) await registrar(sql, mesa.evento_id, mesa.id, "corrigir_skill", { perfil: "mesa", nome: "" });
    return r;
  } catch (e) {
    console.error(e);
    return recusa(mensagemDeFalhaDaIA(e), 502);
  } finally {
    await destravar(sql, mesa.id);
    await avisarMudanca(mesa);
  }
}

/** A mesa aprova a versão atual do SKILL.md. Editar depois pede nova aprovação. */
export async function aprovarSkill(sql: Sql, mesaId: string): Promise<Resultado> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) return recusa("Mesa não encontrada.", 404);
  const problema = conferirMesa(mesa);
  if (problema) return problema;
  const atual = await lerArquivo(sql, mesa.id, "SKILL.md");
  if (!atual) return recusa("A IA ainda não escreveu o SKILL.md.");
  await garantirEntrevista(sql, mesa.id);
  await sql`update entrevista set skill_aprovada_versao = ${atual.versao} where mesa_id = ${mesa.id}`;
  await registrar(sql, mesa.evento_id, mesa.id, "aprovar_skill", { perfil: "mesa", nome: "" }, { versao: atual.versao });
  await avisarMudanca(mesa);
  return { ok: true };
}
