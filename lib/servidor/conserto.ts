import type { Sql } from "./db";
import { iso, mesaPorId, roteiroDoEvento, type LinhaMesa } from "./consultas";
import { avisarMudanca, recusa, registrar, type Resultado } from "./acoes";
import { lerArquivo, salvarArquivo } from "./arquivos";
import { executarPlacar, pastaDaMesa, rodadasPorIds } from "./rodadas";
import { sincronizarProntoQuando } from "./conferencias";
import { destravarIA, travarIA } from "./trava-ia";
import { mensagemDeFalhaDaIA, transmitir } from "@/lib/ia/cliente";
import { lerCampoParcial } from "@/lib/ia/json-parcial";
import { pastaComoTexto } from "@/lib/ia/prompts/rodada";
import { completarSecoes } from "@/lib/ia/prompts/skill";
import { CAMADAS, ESQUEMA_CONSERTO, SISTEMA_CONSERTO, type Camada, type RespostaConserto } from "@/lib/ia/prompts/conserto";
import { motivoDaRecusa } from "@/lib/conferencias";
import { acharSensivel, mascararSensivel, mensagemSensivel } from "@/lib/sensivel";
import type { ConsertoApi } from "@/lib/tipos-api";

// Conserto (Fase 6): a mesa escolhe a falha mais importante do relatório que
// recebeu, marca a camada, a IA propõe o menor conserto e a mesa aprova. O
// conserto entra em notas.md (o mais novo em cima) e a mesa roda de novo.

interface LinhaConserto {
  id: string;
  resultado_conferencia_id: string | null;
  camada: Camada | null;
  o_que_deu_errado: string;
  o_que_mudou: string;
  diagnostico: string;
  proposta: RespostaConserto | null;
  rodada_antes_id: string | null;
  rodada_depois_id: string | null;
  aprovado_em: Date | null;
}

async function consertoAtual(sql: Sql, mesaId: string): Promise<LinhaConserto | null> {
  const [c] = await sql<LinhaConserto[]>`
    select id, resultado_conferencia_id, camada, o_que_deu_errado, o_que_mudou, diagnostico, proposta,
           rodada_antes_id, rodada_depois_id, aprovado_em
    from conserto where mesa_id = ${mesaId} order by criado_em desc, id desc limit 1`;
  return c ?? null;
}

/** Rodada do teste que a parceira fez na pasta desta mesa (o relatório recebido). */
async function rodadaRecebida(sql: Sql, mesaId: string): Promise<string | null> {
  const [t] = await sql<{ rodada_id: string | null }[]>`
    select rodada_id from teste_cruzado where mesa_autora_id = ${mesaId} and estado = 'enviado'
    order by enviado_em desc limit 1`;
  return t?.rodada_id ?? null;
}

export async function montarConserto(sql: Sql, mesa: LinhaMesa): Promise<ConsertoApi> {
  const [c, recebida] = await Promise.all([consertoAtual(sql, mesa.id), rodadaRecebida(sql, mesa.id)]);
  const ids = [recebida, c?.rodada_depois_id].filter(Boolean) as string[];
  const rodadas = await rodadasPorIds(sql, ids);
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from conserto where mesa_id = ${mesa.id} and aprovado_em is not null`;
  return {
    id: c?.id ?? null,
    resultadoConferenciaId: c?.resultado_conferencia_id ?? null,
    camada: c?.camada ?? null,
    oQueDeuErrado: c?.o_que_deu_errado ?? "",
    oQueMudou: c?.o_que_mudou ?? "",
    diagnostico: c?.diagnostico ?? "",
    proposta: c?.proposta
      ? {
          diagnostico: c.proposta.diagnostico,
          oQueDeuErrado: c.proposta.o_que_deu_errado,
          oQueMuda: c.proposta.o_que_muda,
          arquivo: c.proposta.arquivo,
          conteudoNovo: c.proposta.conteudo_novo,
          novaConferencia: c.proposta.nova_conferencia,
        }
      : null,
    aprovado: Boolean(c?.aprovado_em),
    aprovadoEm: iso(c?.aprovado_em ?? null),
    consertosAprovados: n,
    rodadaAntes: rodadas.find((r) => r.id === recebida) ?? null,
    rodadaDepois: rodadas.find((r) => r.id === c?.rodada_depois_id) ?? null,
  };
}

async function conferirFase(sql: Sql, mesa: LinhaMesa, tipo: string): Promise<Resultado | null> {
  if (mesa.estado === "pausada") return recusa("A mesa está pausada.");
  if (mesa.final) return recusa("A skill já foi marcada como final.");
  const roteiro = await roteiroDoEvento(sql, mesa.evento_id);
  const passos = roteiro.passosPorFase.get(mesa.fase_atual) ?? [];
  if (!passos.some((p) => p.tipo_atividade === tipo)) return recusa("O conserto é da Fase 6.", 403);
  return null;
}

async function carregar(sql: Sql, mesaId: string, tipo: string): Promise<{ mesa: LinhaMesa } | Resultado> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) return recusa("Mesa não encontrada.", 404);
  const problema = await conferirFase(sql, mesa, tipo);
  return problema ?? { mesa };
}

/** A mesa escolhe a falha mais importante. Sem falhas no relatório, descreve uma melhoria. */
export async function escolherFalha(
  sql: Sql,
  mesaId: string,
  escolha: { resultadoId: string | null; texto?: string },
): Promise<Resultado> {
  const c = await carregar(sql, mesaId, "relatorio");
  if ("ok" in c) return c as Resultado;
  const recebida = await rodadaRecebida(sql, c.mesa.id);
  if (!recebida) return recusa("O relatório da mesa parceira ainda não chegou.");
  let descricao: string;
  if (escolha.resultadoId) {
    const [r] = await sql<{ descricao: string; prova: string; observacao: string }[]>`
      select descricao, prova, observacao from resultado_conferencia
      where id = ${escolha.resultadoId} and rodada_id = ${recebida}`;
    if (!r) return recusa("Falha não encontrada no relatório.", 404);
    descricao = `Conferência: ${r.descricao}. O que aconteceu: ${r.observacao || r.prova}`;
  } else {
    descricao = (escolha.texto ?? "").replace(/\s+/g, " ").trim();
    if (!descricao) return recusa("Escrevam o que querem melhorar.", 400);
    const achado = acharSensivel(descricao);
    if (achado) return recusa(mensagemSensivel(achado), 400);
  }
  const atual = await consertoAtual(sql, c.mesa.id);
  if (atual && !atual.aprovado_em) {
    await sql`
      update conserto set resultado_conferencia_id = ${escolha.resultadoId}, o_que_deu_errado = ${descricao},
        proposta = null, diagnostico = ''
      where id = ${atual.id}`;
  } else {
    await sql`
      insert into conserto (mesa_id, resultado_conferencia_id, o_que_deu_errado, rodada_antes_id)
      values (${c.mesa.id}, ${escolha.resultadoId}, ${descricao}, ${recebida})`;
  }
  await avisarMudanca(c.mesa);
  return { ok: true };
}

export async function escolherCamada(sql: Sql, mesaId: string, camada: Camada): Promise<Resultado> {
  const c = await carregar(sql, mesaId, "conserto");
  if ("ok" in c) return c as Resultado;
  if (!(camada in CAMADAS)) return recusa("Camada desconhecida.", 400);
  const atual = await consertoAtual(sql, c.mesa.id);
  if (!atual || atual.aprovado_em) return recusa("Escolham a falha antes.");
  await sql`update conserto set camada = ${camada}, proposta = null, diagnostico = '' where id = ${atual.id}`;
  await avisarMudanca(c.mesa);
  return { ok: true };
}

/** A IA propõe o menor conserto na camada marcada. Nada muda na pasta até a mesa aprovar. */
export async function proporConserto(sql: Sql, mesaId: string, aoTexto: (d: string) => void): Promise<Resultado> {
  const c = await carregar(sql, mesaId, "conserto");
  if ("ok" in c) return c as Resultado;
  const atual = await consertoAtual(sql, c.mesa.id);
  if (!atual || atual.aprovado_em) return recusa("Escolham a falha antes.");
  if (!atual.camada) return recusa("Marquem a camada que falhou antes.");
  const recebida = await rodadaRecebida(sql, c.mesa.id);
  const falhas = recebida
    ? await sql<{ numero: number; descricao: string; fonte: string; prova: string; observacao: string }[]>`
        select numero, descricao, fonte, prova, observacao from resultado_conferencia
        where rodada_id = ${recebida} and not passou order by numero`
    : [];
  const pasta = await pastaDaMesa(sql, c.mesa.id);
  if (!(await travarIA(sql, c.mesa.id, 240))) return recusa("A IA já está trabalhando. Esperem terminar.");
  try {
    const lista = falhas.length
      ? falhas.map((f) => `${f.numero}. ${f.descricao} (fonte: ${f.fonte}). Prova: ${f.prova}. O que aconteceu: ${f.observacao || "(sem observação)"}`).join("\n")
      : "(nenhuma conferência falhou)";
    const pedido = `<pasta-da-skill>
${pastaComoTexto(pasta)}
</pasta-da-skill>

Falhas do teste feito pela mesa parceira (${falhas.length}):
${lista}

Falha que o grupo escolheu consertar: ${atual.o_que_deu_errado}
Camada marcada pelo grupo: ${CAMADAS[atual.camada]}.

Proponham o menor conserto duradouro.`;
    let bruto = "";
    let mostrado = "";
    const r = await transmitir(
      {
        tarefa: "conserto",
        sistema: SISTEMA_CONSERTO,
        mensagens: [{ role: "user", content: pedido }],
        esforco: "medium",
        maxTokens: 32000,
        esquema: ESQUEMA_CONSERTO as unknown as Record<string, unknown>,
      },
      (d) => {
        bruto += d;
        const parcial = lerCampoParcial(bruto, "diagnostico") || lerCampoParcial(bruto, "o_que_muda") || "";
        if (parcial.length > mostrado.length && parcial.startsWith(mostrado)) {
          aoTexto(parcial.slice(mostrado.length));
          mostrado = parcial;
        }
      },
    );
    if (r.parada !== "fim") return recusa("A IA não conseguiu propor o conserto. Tentem de novo.", 502);
    const p = JSON.parse(r.texto) as RespostaConserto;
    // RN12: com mais de duas falhas, o diagnóstico vem antes da proposta.
    const diagnostico = falhas.length > 2 ? mascararSensivel(p.diagnostico.trim()) : "";
    const proposta: RespostaConserto = {
      diagnostico,
      o_que_deu_errado: mascararSensivel(p.o_que_deu_errado.trim()),
      o_que_muda: mascararSensivel(p.o_que_muda.trim()),
      arquivo: atual.camada === "prova" ? "SKILL.md" : p.arquivo.trim() || "SKILL.md",
      conteudo_novo: atual.camada === "prova" ? "" : mascararSensivel(p.conteudo_novo.trim()),
      nova_conferencia: atual.camada === "prova" ? p.nova_conferencia : { descricao: "", fonte: "" },
    };
    await sql`update conserto set proposta = ${sql.json(proposta as never)}, diagnostico = ${diagnostico} where id = ${atual.id}`;
    return { ok: true };
  } catch (e) {
    console.error(e);
    return recusa(mensagemDeFalhaDaIA(e), 502);
  } finally {
    await destravarIA(sql, c.mesa.id);
    await avisarMudanca(c.mesa);
  }
}

function hoje(): string {
  return new Date().toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" });
}

/** Linha nova no topo de notas.md: data, o que deu errado e o que mudou. */
export function notaDeConserto(notasAtuais: string | null, item: { camada: Camada; deuErrado: string; mudou: string }): string {
  const cabecalho = "# Notas de conserto\n\nO conserto mais novo fica em cima.";
  const corpo = (notasAtuais ?? "").replace(/^# Notas de conserto\s*\n+(O conserto mais novo fica em cima\.\s*\n*)?/, "").trim();
  const nova = `## ${hoje()}\n- O que deu errado: ${item.deuErrado}\n- Camada: ${item.camada}\n- O que mudou: ${item.mudou}`;
  return `${cabecalho}\n\n${nova}${corpo ? `\n\n${corpo}` : ""}\n`;
}

/** A mesa aprova o conserto (com ajustes, se quiser). A pasta muda e notas.md registra. */
export async function aprovarConserto(
  sql: Sql,
  mesaId: string,
  ajustes: { conteudoNovo?: string; novaConferencia?: { descricao: string; fonte: string }; oQueMuda?: string },
): Promise<Resultado> {
  const c = await carregar(sql, mesaId, "conserto");
  if ("ok" in c) return c as Resultado;
  const atual = await consertoAtual(sql, c.mesa.id);
  if (!atual?.proposta || !atual.camada) return recusa("Peçam a proposta da IA antes.");
  if (atual.aprovado_em) return { ok: true };
  const p = atual.proposta;
  const mudou = (ajustes.oQueMuda ?? p.o_que_muda).trim();
  const camada = atual.camada;
  const r = await sql.begin(async (txBruta): Promise<Resultado> => {
    const tx = txBruta as unknown as Sql;
    const mesa = (await mesaPorId(tx, c.mesa.id))!;
    if (camada === "prova") {
      const nova = ajustes.novaConferencia ?? p.nova_conferencia;
      const [e] = await tx<{ palavras_vagas: string[] }[]>`select palavras_vagas from evento where id = ${mesa.evento_id}`;
      const motivo = motivoDaRecusa(nova.descricao, nova.fonte, e?.palavras_vagas ?? []);
      if (motivo) return recusa(motivo, 400);
      const achado = acharSensivel(`${nova.descricao} ${nova.fonte}`);
      if (achado) return recusa(mensagemSensivel(achado), 400);
      await tx`
        insert into conferencia (mesa_id, ordem, descricao, fonte, valida)
        values (${mesa.id}, (select coalesce(max(ordem), 0) + 1 from conferencia where mesa_id = ${mesa.id}),
                ${nova.descricao.trim()}, ${nova.fonte.trim()}, true)`;
      await sincronizarProntoQuando(tx, mesa);
    } else {
      let conteudo = (ajustes.conteudoNovo ?? p.conteudo_novo).trim();
      const caminho = p.arquivo === "SKILL.md" ? "SKILL.md" : p.arquivo.replace(/^\/+/, "");
      if (!conteudo) return recusa("O conserto está vazio.", 400);
      if (caminho === "SKILL.md") conteudo = completarSecoes(conteudo);
      else if (!/\[[^\]\n]{2,}\]/.test(conteudo)) {
        return recusa("Um modelo precisa de lacunas entre colchetes no lugar do que muda de um caso para outro.", 400);
      }
      const salvo = await salvarArquivo(tx, mesa, caminho, `${conteudo.trim()}\n`, { autor: "mesa" });
      if (!salvo.ok) return salvo;
    }
    const notas = await lerArquivo(tx, mesa.id, "notas.md");
    const nota = notaDeConserto(notas?.conteudo ?? null, { camada, deuErrado: p.o_que_deu_errado || atual.o_que_deu_errado, mudou });
    const sNotas = await salvarArquivo(tx, mesa, "notas.md", nota, { autor: "mesa" });
    if (!sNotas.ok) return sNotas;
    await tx`update conserto set aprovado_em = now(), o_que_mudou = ${mudou} where id = ${atual.id}`;
    await registrar(tx, mesa.evento_id, mesa.id, "aprovar_conserto", { perfil: "mesa", nome: "" }, { camada });
    return { ok: true };
  });
  if (r.ok) await avisarMudanca(c.mesa);
  return r;
}

/** Nova rodada com o caso novo, para comparar antes e depois do conserto. */
export async function rodarDepoisDoConserto(sql: Sql, mesaId: string, aoTexto: (d: string) => void): Promise<Resultado> {
  const c = await carregar(sql, mesaId, "rodada");
  if ("ok" in c) return c as Resultado;
  const atual = await consertoAtual(sql, c.mesa.id);
  if (!atual?.aprovado_em) return recusa("Aprovem o conserto antes de rodar de novo.");
  const r = await executarPlacar(
    sql,
    { mesaQueRoda: c.mesa, mesaDaPasta: c.mesa, tipo: "conserto_depois", caso: "caso_novo", consertar: false },
    aoTexto,
  );
  if (!r.ok) return r;
  await sql`update conserto set rodada_depois_id = ${r.dados!.rodadaId} where id = ${atual.id}`;
  await avisarMudanca(c.mesa);
  return { ok: true };
}

/** Dados do conserto para os critérios da Fase 6. */
export async function dadosDoConsertoParaCriterios(sql: Sql, mesaId: string) {
  const c = await consertoAtual(sql, mesaId);
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from conserto where mesa_id = ${mesaId} and aprovado_em is not null and rodada_depois_id is not null`;
  return {
    falhaEscolhida: Boolean(c && (c.resultado_conferencia_id || c.o_que_deu_errado)),
    camadaEscolhida: Boolean(c?.camada),
    consertoAprovado: Boolean(c?.aprovado_em),
    rodadaDepois: Boolean(c?.rodada_depois_id),
    consertosCompletos: n,
  };
}
