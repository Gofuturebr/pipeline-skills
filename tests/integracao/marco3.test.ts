import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { encerrarSql, prepararBanco, URL_TESTE } from "../ajuda/banco";
import { criarIaSimulada, type IaSimulada } from "@/lib/ia/simulada";
import type { Sql } from "@/lib/servidor/db";
import { acaoDeFase, concluirPasso, type Autor } from "@/lib/servidor/acoes";
import { mesaPorId, roteiroDoEvento } from "@/lib/servidor/consultas";
import { montarEstadoMesa } from "@/lib/servidor/estado-mesa";
import { aprovarSkill, encerrarEntrevista, gerarSkill, turnoDaEntrevista } from "@/lib/servidor/entrevista";
import { editarSecao } from "@/lib/servidor/edicao";
import { versoesDoArquivo } from "@/lib/servidor/arquivos";
import { entrarParticipante, montarEstadoCelular, participantePorToken } from "@/lib/servidor/participantes";
import { definirIAParaTestes } from "@/lib/ia/cliente";
import { SECOES_SKILL } from "@/lib/ia/prompts/skill";

const GESTOR: Autor = { perfil: "gestor", nome: "Gestora Teste" };

describe.skipIf(!URL_TESTE)("Marco 3: entrevista com a IA e SKILL.md", () => {
  let sql: Sql;
  let mesaId: string;
  let ia: IaSimulada;

  beforeEach(async () => {
    const r = await prepararBanco();
    sql = r.sql;
    mesaId = r.mesas[0].id;
    ia = criarIaSimulada();
    definirIAParaTestes(ia.transmissor);
    while ((await mesaPorId(sql, mesaId))!.fase_atual < 2) {
      expect((await acaoDeFase(sql, mesaId, "forcar", GESTOR)).ok).toBe(true);
    }
  });

  afterEach(() => definirIAParaTestes(null));
  afterAll(async () => {
    await encerrarSql();
  });

  async function estado() {
    return montarEstadoMesa(sql, (await mesaPorId(sql, mesaId))!);
  }

  async function responder(n: number) {
    for (let i = 0; i < n; i++) {
      expect((await turnoDaEntrevista(sql, mesaId, `Resposta ${i + 1}`, () => {})).ok).toBe(true);
    }
  }

  it("a IA faz uma pergunta por vez, que chega aos poucos", async () => {
    let recebido = "";
    expect((await turnoDaEntrevista(sql, mesaId, undefined, (d) => (recebido += d))).ok).toBe(true);
    const e = (await estado()).entrevista!;
    expect(e.perguntas).toHaveLength(1);
    expect(e.perguntas[0].texto).toBe('Pergunta 1: como vocês fazem "isso" hoje?');
    // Só o texto da pergunta chega à tela, sem o formato estruturado.
    expect(recebido).toBe(e.perguntas[0].texto);
    // Sem resposta e com pergunta esperando, não pede outra.
    expect((await turnoDaEntrevista(sql, mesaId, undefined, () => {})).ok).toBe(true);
    expect((await estado()).entrevista!.perguntas).toHaveLength(1);
    expect(ia.pedidos).toHaveLength(1);
    // O pedido leva a ficha e o kit, e a chamada usa saída estruturada.
    expect(JSON.stringify(ia.pedidos[0].mensagens)).toContain("Ficha");
    expect(ia.pedidos[0].esquema).toBeTruthy();
  });

  it("RN07: com 5 perguntas, a IA não escreve o SKILL.md e a entrevista não encerra", async () => {
    await turnoDaEntrevista(sql, mesaId, undefined, () => {});
    await responder(5);
    const e = (await estado()).entrevista!;
    expect(e.respondidas).toBe(5);
    expect(e.podeEncerrar).toBe(false);
    expect(e.falta).toBe("Falta 3 perguntas e cobrir 3 temas");
    const r = await gerarSkill(sql, mesaId, () => {});
    expect(r).toMatchObject({ ok: false, status: 409 });
    expect(r.ok ? "" : r.motivo).toContain("8 perguntas");
    expect((await encerrarEntrevista(sql, mesaId)).ok).toBe(false);
    expect((await estado()).arquivos).toHaveLength(0);
    expect(ia.pedidos.some((p) => p.tarefa === "skill")).toBe(false);
  });

  it("entrevista completa: o SKILL.md aparece na pasta com as 7 seções e passa pela aprovação", async () => {
    await turnoDaEntrevista(sql, mesaId, undefined, () => {});
    await responder(8);
    let e = (await estado()).entrevista!;
    expect(e.temasCobertos).toHaveLength(8);
    expect(e.podeEncerrar).toBe(true);
    expect((await encerrarEntrevista(sql, mesaId)).ok).toBe(true);

    let escrito = "";
    expect((await gerarSkill(sql, mesaId, (d) => (escrito += d))).ok).toBe(true);
    let s = await estado();
    const skill = s.arquivos.find((a) => a.caminho === "SKILL.md")!;
    expect(skill.versao).toBe(1);
    expect(skill.autor).toBe("ia");
    for (const secao of SECOES_SKILL) expect(skill.conteudo).toContain(`## ${secao}`);
    expect(escrito.length).toBeGreaterThan(50);
    expect(s.mesa.nomeSkill).toBe("orcamento-pelo-whatsapp");

    // A mesa edita uma seção: nova versão, histórico guardado (RN06).
    expect((await editarSecao(sql, mesaId, "SKILL.md", "Passos", "1. Ler o pedido.\n2. Montar o orçamento.", 1)).ok).toBe(true);
    // Versão antiga não sobrescreve a nova.
    expect((await editarSecao(sql, mesaId, "SKILL.md", "Passos", "x", 1)).ok).toBe(false);
    // Dado sensível não entra na pasta (RN14).
    const sensivel = await editarSecao(sql, mesaId, "SKILL.md", "Passos", "Use o CPF 123.456.789-09.", 2);
    expect(sensivel).toMatchObject({ ok: false, motivo: "Isto parece um CPF. Troque por um dado fictício antes de guardar." });
    const versoes = await versoesDoArquivo(sql, mesaId, "SKILL.md");
    expect(versoes.map((v) => v.versao)).toEqual([2, 1]);
    expect(versoes[0].autor).toBe("mesa");

    // Passos da fase: entrevista, gerar e revisar. Aprovar libera a fase.
    s = await estado();
    expect(s.avaliacaoFase.ok).toBe(false);
    expect((await aprovarSkill(sql, mesaId)).ok).toBe(true);
    const roteiro = await roteiroDoEvento(sql, s.evento.id);
    for (const p of roteiro.passosPorFase.get(2)!) expect((await concluirPasso(sql, mesaId, p.id)).ok).toBe(true);
    s = await estado();
    expect(s.avaliacaoFase.ok).toBe(true);
    e = s.entrevista!;
    expect(e.skillAprovadaVersao).toBe(2);

    // Editar depois de aprovar pede nova aprovação.
    expect((await editarSecao(sql, mesaId, "SKILL.md", "Decisões", "Se faltar estoque, avisar o cliente.", 2)).ok).toBe(true);
    expect((await estado()).avaliacaoFase.ok).toBe(false);
  });

  it("resposta com dado sensível é recusada e o celular mostra a pergunta atual", async () => {
    await turnoDaEntrevista(sql, mesaId, undefined, () => {});
    const r = await turnoDaEntrevista(sql, mesaId, "O CNPJ é 12.345.678/0001-95", () => {});
    expect(r).toMatchObject({ ok: false, motivo: "Isto parece um CNPJ. Troque por um dado fictício antes de enviar." });
    const entrada = await entrarParticipante(sql, (await mesaPorId(sql, mesaId))!, "Lia");
    const p = await participantePorToken(sql, mesaId, entrada.ok ? entrada.dados!.token : "");
    const celular = await montarEstadoCelular(sql, (await mesaPorId(sql, mesaId))!, p);
    expect(celular.perguntaAtual).toContain("Pergunta 1");
    expect(celular.contribuicao?.rotulo).toBeTruthy();
  });

  it("a IA não responde duas vezes ao mesmo tempo, e recusa vira mensagem para a mesa", async () => {
    await sql`insert into entrevista (mesa_id, ocupada_ate) values (${mesaId}, now() + interval '60 seconds')
              on conflict (mesa_id) do update set ocupada_ate = excluded.ocupada_ate`;
    expect(await turnoDaEntrevista(sql, mesaId, undefined, () => {})).toMatchObject({ ok: false });
    await sql`update entrevista set ocupada_ate = null where mesa_id = ${mesaId}`;

    ia.fila.entrevista = ["{ incompleto"];
    const r = await turnoDaEntrevista(sql, mesaId, undefined, () => {});
    expect(r).toMatchObject({ ok: false, status: 502 });
    // A trava é liberada e a próxima tentativa funciona.
    expect((await turnoDaEntrevista(sql, mesaId, undefined, () => {})).ok).toBe(true);
  });
});
