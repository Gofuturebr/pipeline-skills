import type { Sql } from "./db";
import { iso, mesaPorId, roteiroDoEvento, type LinhaMesa, type LinhaPasso } from "./consultas";
import { avisarMudanca, recusa, registrar, type Resultado } from "./acoes";
import { lerArquivo, salvarArquivo } from "./arquivos";
import { processoDaMesa } from "./processo";
import { destravarIA, travarIA } from "./trava-ia";
import { mensagemDeFalhaDaIA, transmitir } from "@/lib/ia/cliente";
import { lerCampoParcial } from "@/lib/ia/json-parcial";
import {
  ESQUEMA_CONGELAR,
  ESQUEMA_PLACAR,
  ESQUEMA_RODADA,
  SISTEMA_CONGELAR,
  SISTEMA_RODADA,
  pastaComoTexto,
  sistemaPlacar,
  type RespostaCongelar,
  type RespostaPlacar,
  type RespostaRodada,
} from "@/lib/ia/prompts/rodada";
import { dividirSecoes, juntarSecoes, lerSecao, trocarSecao } from "@/lib/markdown";
import { acharSensivel, mascararSensivel, mensagemSensivel } from "@/lib/sensivel";
import type { ResultadoConferenciaApi, RodadaApi } from "@/lib/tipos-api";

// Rodadas (o Claude usa a skill para fazer a tarefa), caixa de ferramentas
// (congelar e guardar modelos, salvar exemplos) e placar das conferências.

export type TipoRodada = "exemplo" | "segunda" | "prova" | "teste" | "conserto_antes" | "conserto_depois";

const TRAVA_RODADA_S = 240;

interface LinhaRodada {
  id: string;
  mesa_id: string;
  pasta_mesa_id: string | null;
  fase: number;
  tipo: TipoRodada;
  entrada: string;
  saida: string;
  relatorio: { reusou?: RespostaRodada["reusou"]; refez?: string[] };
  criado_em: Date;
}

interface LinhaResultado {
  id: string;
  rodada_id: string;
  conferencia_id: string | null;
  numero: number;
  descricao: string;
  fonte: string;
  passou: boolean;
  prova: string;
  observacao: string;
  conseguiu_conferir: boolean;
}

function resultadoParaApi(r: LinhaResultado): ResultadoConferenciaApi {
  return {
    id: r.id,
    conferenciaId: r.conferencia_id,
    numero: r.numero,
    descricao: r.descricao,
    fonte: r.fonte,
    passou: r.passou,
    prova: r.prova,
    conseguiuConferir: r.conseguiu_conferir,
    observacao: r.observacao,
  };
}

export async function rodadasPorIds(sql: Sql, ids: string[]): Promise<RodadaApi[]> {
  if (ids.length === 0) return [];
  const [rodadas, resultados] = await Promise.all([
    sql<LinhaRodada[]>`
      select id, mesa_id, pasta_mesa_id, fase, tipo, entrada, saida, relatorio, criado_em
      from rodada where id in ${sql(ids)} order by criado_em, id`,
    sql<LinhaResultado[]>`
      select id, rodada_id, conferencia_id, numero, descricao, fonte, passou, prova, observacao, conseguiu_conferir
      from resultado_conferencia where rodada_id in ${sql(ids)} order by numero`,
  ]);
  return rodadas.map((r) => {
    const placar = resultados.filter((x) => x.rodada_id === r.id).map(resultadoParaApi);
    return {
      id: r.id,
      fase: r.fase,
      tipo: r.tipo,
      mesaId: r.mesa_id,
      pastaMesaId: r.pasta_mesa_id ?? r.mesa_id,
      entrada: r.entrada,
      saida: r.saida,
      reusou: r.relatorio?.reusou ?? [],
      refez: r.relatorio?.refez ?? [],
      criadoEm: iso(r.criado_em) as string,
      placar: r.tipo === "exemplo" || r.tipo === "segunda" ? null : placar,
    };
  });
}

/** Rodadas feitas pela mesa (com a própria pasta ou, no teste, com a da parceira). */
export async function rodadasDaMesa(sql: Sql, mesaId: string): Promise<RodadaApi[]> {
  const ids = await sql<{ id: string }[]>`select id from rodada where mesa_id = ${mesaId} order by criado_em`;
  return rodadasPorIds(sql, ids.map((i) => i.id));
}

export async function pastaDaMesa(sql: Sql, mesaId: string): Promise<{ caminho: string; conteudo: string }[]> {
  return sql<{ caminho: string; conteudo: string }[]>`
    select caminho, conteudo from arquivo where mesa_id = ${mesaId}
    order by case when caminho = 'SKILL.md' then 0 else 1 end, caminho`;
}

async function passosDaFase(sql: Sql, mesa: LinhaMesa): Promise<LinhaPasso[]> {
  const roteiro = await roteiroDoEvento(sql, mesa.evento_id);
  return roteiro.passosPorFase.get(mesa.fase_atual) ?? [];
}

function conferirMesa(mesa: LinhaMesa): Resultado | null {
  if (mesa.estado === "pausada") return recusa("A mesa está pausada.");
  return null;
}

function dataDeHoje(): string {
  return new Date().toLocaleDateString("pt-BR", {
    timeZone: "America/Fortaleza",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function pedidoDoCaso(pasta: { caminho: string; conteudo: string }[], materiais: string, caso: string): string {
  return `Data de hoje: ${dataDeHoje()}.

<pasta-da-skill>
${pastaComoTexto(pasta)}
</pasta-da-skill>

<materiais-do-caso>
${materiais || "(sem materiais)"}
</materiais-do-caso>

<caso>
${caso}
</caso>

Façam a tarefa deste caso usando a skill.`;
}

/** Rodada simples (Fase 3): faz a tarefa com a pasta da própria mesa. */
export async function rodar(
  sql: Sql,
  mesaId: string,
  tipo: "exemplo" | "segunda",
  aoTexto: (delta: string) => void,
): Promise<Resultado<{ rodadaId: string }>> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) return recusa("Mesa não encontrada.", 404);
  const problema = conferirMesa(mesa);
  if (problema) return problema;
  const passos = await passosDaFase(sql, mesa);
  const passo = passos.find((p) => p.tipo_atividade === "rodada" && p.config?.tipoRodada === tipo);
  if (!passo) return recusa("Esta rodada não é da fase liberada para a mesa.", 403);
  const processo = await processoDaMesa(sql, mesa);
  const caso = String(passo.config?.caso === "caso_novo" ? processo?.caso_novo ?? "" : processo?.caso_exemplo ?? "");
  if (!caso.trim()) return recusa("O kit desta mesa não tem o caso para rodar. Chamem o gestor.");
  const pasta = await pastaDaMesa(sql, mesa.id);
  if (!pasta.some((a) => a.caminho === "SKILL.md")) return recusa("A pasta ainda não tem o SKILL.md.");
  if (!(await travarIA(sql, mesa.id, TRAVA_RODADA_S))) return recusa("A IA já está trabalhando. Esperem terminar.");
  try {
    let bruto = "";
    let mostrado = "";
    const r = await transmitir(
      {
        tarefa: "rodada",
        sistema: SISTEMA_RODADA,
        mensagens: [{ role: "user", content: pedidoDoCaso(pasta, processo?.kit_materiais ?? "", caso) }],
        esforco: "medium",
        maxTokens: 32000,
        esquema: ESQUEMA_RODADA as unknown as Record<string, unknown>,
      },
      (d) => {
        bruto += d;
        const parcial = lerCampoParcial(bruto, "resultado");
        if (parcial && parcial.length > mostrado.length) {
          aoTexto(parcial.slice(mostrado.length));
          mostrado = parcial;
        }
      },
    );
    if (r.parada !== "fim") return recusa("A IA não conseguiu terminar a rodada. Tentem de novo.", 502);
    let dados: RespostaRodada;
    try {
      dados = JSON.parse(r.texto) as RespostaRodada;
    } catch {
      return recusa("A resposta não chegou inteira. Tentem de novo.", 502);
    }
    const [linha] = await sql<{ id: string }[]>`
      insert into rodada (mesa_id, pasta_mesa_id, fase, tipo, entrada, saida, relatorio)
      values (${mesa.id}, ${mesa.id}, ${mesa.fase_atual}, ${tipo}, ${caso}, ${mascararSensivel(dados.resultado)},
              ${sql.json({ reusou: dados.reusou ?? [], refez: dados.refez ?? [] })})
      returning id`;
    await registrar(sql, mesa.evento_id, mesa.id, "rodada", { perfil: "mesa", nome: "" }, { tipo });
    return { ok: true, dados: { rodadaId: linha.id } };
  } catch (e) {
    console.error(e);
    return recusa(mensagemDeFalhaDaIA(e), 502);
  } finally {
    await destravarIA(sql, mesa.id);
    await avisarMudanca(mesa);
  }
}

export interface PedidoPlacar {
  /** A mesa que roda (no teste cruzado, a testadora). */
  mesaQueRoda: LinhaMesa;
  /** A mesa dona da pasta e das conferências. */
  mesaDaPasta: LinhaMesa;
  tipo: "prova" | "teste" | "conserto_depois";
  caso: "caso_exemplo" | "caso_novo";
  consertar: boolean;
}

/** Faz a tarefa com a skill e confere o resultado contra as conferências (placar). */
export async function executarPlacar(
  sql: Sql,
  pedido: PedidoPlacar,
  aoTexto: (delta: string) => void,
): Promise<Resultado<{ rodadaId: string }>> {
  const { mesaQueRoda, mesaDaPasta } = pedido;
  const problema = conferirMesa(mesaQueRoda);
  if (problema) return problema;
  const [processo, pasta, conferencias] = await Promise.all([
    processoDaMesa(sql, mesaDaPasta),
    pastaDaMesa(sql, mesaDaPasta.id),
    sql<{ id: string; descricao: string; fonte: string }[]>`
      select id, descricao, fonte from conferencia where mesa_id = ${mesaDaPasta.id} and valida order by ordem`,
  ]);
  const caso = String((pedido.caso === "caso_novo" ? processo?.caso_novo : processo?.caso_exemplo) ?? "");
  if (!caso.trim()) return recusa("O kit não tem o caso para rodar. Chamem o gestor.");
  if (!pasta.some((a) => a.caminho === "SKILL.md")) return recusa("A pasta ainda não tem o SKILL.md.");
  if (conferencias.length === 0) return recusa("A pasta ainda não tem conferências válidas.");
  if (!(await travarIA(sql, mesaQueRoda.id, TRAVA_RODADA_S))) return recusa("A IA já está trabalhando. Esperem terminar.");
  try {
    const lista = conferencias.map((c, i) => `${i + 1}. ${c.descricao} (fonte: ${c.fonte})`).join("\n");
    let bruto = "";
    let mostrado = "";
    const r = await transmitir(
      {
        tarefa: "placar",
        sistema: sistemaPlacar(pedido.consertar),
        mensagens: [
          {
            role: "user",
            content: `${pedidoDoCaso(pasta, processo?.kit_materiais ?? "", caso)}\n\nConferências:\n${lista}`,
          },
        ],
        // Conferir sem consertar é mais leve: esforço baixo deixa o teste mais rápido.
        esforco: pedido.consertar ? "medium" : "low",
        maxTokens: 32000,
        esquema: ESQUEMA_PLACAR as unknown as Record<string, unknown>,
      },
      (d) => {
        bruto += d;
        const parcial = lerCampoParcial(bruto, "resultado");
        if (parcial && parcial.length > mostrado.length) {
          aoTexto(parcial.slice(mostrado.length));
          mostrado = parcial;
        }
      },
    );
    if (r.parada !== "fim") return recusa("A IA não conseguiu terminar a rodada. Tentem de novo.", 502);
    let dados: RespostaPlacar;
    try {
      dados = JSON.parse(r.texto) as RespostaPlacar;
    } catch {
      return recusa("A resposta não chegou inteira. Tentem de novo.", 502);
    }
    const rodadaId = await sql.begin(async (txBruta) => {
      const tx = txBruta as unknown as Sql;
      const [linha] = await tx<{ id: string }[]>`
        insert into rodada (mesa_id, pasta_mesa_id, fase, tipo, entrada, saida)
        values (${mesaQueRoda.id}, ${mesaDaPasta.id}, ${mesaQueRoda.fase_atual}, ${pedido.tipo}, ${caso},
                ${mascararSensivel(dados.resultado)})
        returning id`;
      for (const [i, c] of conferencias.entries()) {
        const item = dados.conferencias.find((x) => x.numero === i + 1);
        await tx`
          insert into resultado_conferencia
            (rodada_id, conferencia_id, numero, descricao, fonte, passou, prova, conseguiu_conferir)
          values (${linha.id}, ${c.id}, ${i + 1}, ${c.descricao}, ${c.fonte},
                  ${item ? item.passou && item.conseguiu_conferir : false},
                  ${mascararSensivel(item?.prova ?? "A IA não informou esta conferência.")},
                  ${item ? item.conseguiu_conferir : false})`;
      }
      return linha.id;
    });
    await registrar(sql, mesaQueRoda.evento_id, mesaQueRoda.id, "placar", { perfil: "mesa", nome: "" }, {
      tipo: pedido.tipo,
      pasta: mesaDaPasta.id,
    });
    return { ok: true, dados: { rodadaId } };
  } catch (e) {
    console.error(e);
    return recusa(mensagemDeFalhaDaIA(e), 502);
  } finally {
    await destravarIA(sql, mesaQueRoda.id);
    await avisarMudanca(mesaQueRoda);
  }
}

/** Fase 4: a mesa roda a tarefa e a IA confere, conserta e mostra o placar. */
export async function rodarProva(sql: Sql, mesaId: string, aoTexto: (d: string) => void): Promise<Resultado> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) return recusa("Mesa não encontrada.", 404);
  const passos = await passosDaFase(sql, mesa);
  if (!passos.some((p) => p.tipo_atividade === "placar" && p.config?.modo === "prova")) {
    return recusa("A prova não é da fase liberada para a mesa.", 403);
  }
  const r = await executarPlacar(
    sql,
    { mesaQueRoda: mesa, mesaDaPasta: mesa, tipo: "prova", caso: "caso_exemplo", consertar: true },
    aoTexto,
  );
  return r.ok ? { ok: true } : r;
}

async function conferirCaixa(sql: Sql, mesaId: string): Promise<{ mesa: LinhaMesa } | Resultado> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) return recusa("Mesa não encontrada.", 404);
  const problema = conferirMesa(mesa);
  if (problema) return problema;
  if (mesa.final) return recusa("A skill já foi marcada como final.");
  const passos = await passosDaFase(sql, mesa);
  if (!passos.some((p) => p.tipo_atividade === "caixa")) return recusa("A caixa de ferramentas é da Fase 3.", 403);
  return { mesa };
}

/** A IA propõe um modelo com lacunas a partir de um trecho aprovado. Não salva nada (RN13). */
export async function congelar(sql: Sql, mesaId: string, trecho: string): Promise<Resultado<RespostaCongelar>> {
  const c = await conferirCaixa(sql, mesaId);
  if ("ok" in c) return c as Resultado<never>;
  const texto = trecho.trim();
  if (!texto) return recusa("Escolham um trecho para congelar.", 400);
  if (!(await travarIA(sql, c.mesa.id, 90))) return recusa("A IA já está trabalhando. Esperem terminar.");
  try {
    const r = await transmitir({
      tarefa: "congelar",
      sistema: SISTEMA_CONGELAR,
      mensagens: [{ role: "user", content: `Trecho aprovado pelo grupo:\n\n${texto}` }],
      esforco: "low",
      maxTokens: 8000,
      esquema: ESQUEMA_CONGELAR as unknown as Record<string, unknown>,
    });
    if (r.parada !== "fim") return recusa("A IA não conseguiu preparar o modelo. Tentem de novo.", 502);
    const dados = JSON.parse(r.texto) as RespostaCongelar;
    return {
      ok: true,
      dados: {
        nome_arquivo: nomeDeModelo(dados.nome_arquivo),
        pra_que_serve: mascararSensivel(dados.pra_que_serve.trim()),
        conteudo: mascararSensivel(dados.conteudo.trim()),
      },
    };
  } catch (e) {
    console.error(e);
    return recusa(mensagemDeFalhaDaIA(e), 502);
  } finally {
    await destravarIA(sql, c.mesa.id);
  }
}

/** Nome de arquivo seguro para a caixa: minúsculas, hífens, prefixo "modelo-". */
export function nomeDeModelo(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\.md$/, "")
    .replace(/^modelo-/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return `modelo-${base || "sem-nome"}.md`;
}

function hoje(): string {
  return new Date().toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" });
}

/** Atualiza a linha do arquivo no INDICE.md: nome, para que serve e data. */
export function atualizarIndice(indiceAtual: string | null, arquivo: string, praQueServe: string): string {
  const cabecalho = "# Índice da caixa de ferramentas\n\nUma linha por arquivo: nome, para que serve e data.\n";
  const linhas = (indiceAtual ?? cabecalho).split("\n");
  const nova = `- \`${arquivo}\`: ${praQueServe.replace(/\s+/g, " ").trim()} (${hoje()})`;
  const i = linhas.findIndex((l) => l.startsWith(`- \`${arquivo}\``));
  if (i >= 0) linhas[i] = nova;
  else {
    while (linhas.length && linhas[linhas.length - 1].trim() === "") linhas.pop();
    linhas.push(nova);
  }
  return `${linhas.join("\n").trim()}\n`;
}

/** Cita o arquivo da caixa na seção "O que precisa" do SKILL.md, se ainda não cita. */
export function citarNoSkill(skill: string, caminho: string, praQueServe: string): string {
  if (skill.includes(caminho)) return skill;
  const corpo = lerSecao(skill, "O que precisa") ?? "";
  const linha = `- Modelo \`${caminho}\`: ${praQueServe.replace(/\s+/g, " ").trim()} Use este modelo e preencha as lacunas.`;
  return trocarSecao(skill, "O que precisa", `${corpo.trim()}\n${linha}`.trim());
}

/** A mesa confirma o modelo: entra em arquivos/, no INDICE.md e no SKILL.md. */
export async function guardarModelo(
  sql: Sql,
  mesaId: string,
  proposta: { nomeArquivo: string; praQueServe: string; conteudo: string },
): Promise<Resultado> {
  const c = await conferirCaixa(sql, mesaId);
  if ("ok" in c) return c as Resultado;
  const conteudo = proposta.conteudo.trim();
  const praQueServe = proposta.praQueServe.trim();
  // RN13: nada de resultado de uma vez só. O modelo precisa de lacunas.
  if (!/\[[^\]\n]{2,}\]/.test(conteudo)) {
    return recusa("Um modelo precisa de lacunas entre colchetes no lugar do que muda de um caso para outro.", 400);
  }
  if (!praQueServe) return recusa("Digam em uma frase para que serve o modelo.", 400);
  for (const t of [conteudo, praQueServe]) {
    const achado = acharSensivel(t);
    if (achado) return recusa(mensagemSensivel(achado), 400);
  }
  const caminho = `arquivos/${nomeDeModelo(proposta.nomeArquivo)}`;
  const r = await sql.begin(async (txBruta): Promise<Resultado> => {
    const tx = txBruta as unknown as Sql;
    await tx`select id from mesa where id = ${c.mesa.id} for update`;
    const salvo = await salvarArquivo(tx, c.mesa, caminho, `${conteudo}\n`, { autor: "mesa" });
    if (!salvo.ok) return salvo;
    const indice = await lerArquivo(tx, c.mesa.id, "arquivos/INDICE.md");
    const novoIndice = atualizarIndice(indice?.conteudo ?? null, caminho.replace("arquivos/", ""), praQueServe);
    const sIndice = await salvarArquivo(tx, c.mesa, "arquivos/INDICE.md", novoIndice, { autor: "ia" });
    if (!sIndice.ok) return sIndice;
    const skill = await lerArquivo(tx, c.mesa.id, "SKILL.md");
    if (skill) {
      const sSkill = await salvarArquivo(tx, c.mesa, "SKILL.md", citarNoSkill(skill.conteudo, caminho, praQueServe), { autor: "ia" });
      if (!sSkill.ok) return sSkill;
    }
    await registrar(tx, c.mesa.evento_id, c.mesa.id, "guardar_modelo", { perfil: "mesa", nome: "" }, { caminho });
    return { ok: true };
  });
  if (r.ok) await avisarMudanca(c.mesa);
  return r;
}

/** O Guardião salva o resultado aprovado em exemplos/. */
export async function salvarExemplo(sql: Sql, mesaId: string, rodadaId: string, texto: string): Promise<Resultado> {
  const c = await conferirCaixa(sql, mesaId);
  if ("ok" in c) return c as Resultado;
  const [rodada] = await sql<{ entrada: string }[]>`
    select entrada from rodada where id = ${rodadaId} and mesa_id = ${c.mesa.id}`;
  if (!rodada) return recusa("Rodada não encontrada.", 404);
  const resultado = texto.trim();
  if (!resultado) return recusa("O exemplo está vazio.", 400);
  const r = await sql.begin(async (txBruta): Promise<Resultado> => {
    const tx = txBruta as unknown as Sql;
    await tx`select id from mesa where id = ${c.mesa.id} for update`;
    const [{ n }] = await tx<{ n: number }[]>`
      select count(*)::int as n from arquivo where mesa_id = ${c.mesa.id} and caminho like 'exemplos/%'`;
    const caminho = `exemplos/bom-${n + 1}.md`;
    const conteudo = juntarSecoes({
      ...dividirSecoes(""),
      titulo: `Exemplo bom ${n + 1}`,
      abertura: "Resultado aprovado pela mesa.",
      secoes: [
        { nome: "Entrada", corpo: rodada.entrada.trim() },
        { nome: "Resultado", corpo: resultado },
      ],
    });
    const salvo = await salvarArquivo(tx, c.mesa, caminho, conteudo, { autor: "mesa" });
    if (!salvo.ok) return salvo;
    await registrar(tx, c.mesa.evento_id, c.mesa.id, "salvar_exemplo", { perfil: "mesa", nome: "" }, { caminho });
    return { ok: true };
  });
  if (r.ok) await avisarMudanca(c.mesa);
  return r;
}
