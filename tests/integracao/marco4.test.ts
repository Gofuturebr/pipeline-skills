import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { encerrarSql, prepararBanco, URL_TESTE } from "../ajuda/banco";
import type { Sql } from "@/lib/servidor/db";
import { acaoDeFase, concluirPasso, type Autor } from "@/lib/servidor/acoes";
import { mesaPorId, roteiroDoEvento } from "@/lib/servidor/consultas";
import { montarEstadoMesa } from "@/lib/servidor/estado-mesa";
import { salvarArquivo, lerArquivo } from "@/lib/servidor/arquivos";
import { congelar, guardarModelo, rodar, rodarProva, salvarExemplo } from "@/lib/servidor/rodadas";
import { importarDoSkill, removerConferencia, salvarConferencia } from "@/lib/servidor/conferencias";
import { definirIAParaTestes } from "@/lib/ia/cliente";
import { criarIaSimulada, SKILL_SIMULADA } from "@/lib/ia/simulada";
import { lerSecao } from "@/lib/markdown";

const GESTOR: Autor = { perfil: "gestor", nome: "Gestora Teste" };

describe.skipIf(!URL_TESTE)("Marco 4: caixa de ferramentas e prova", () => {
  let sql: Sql;
  let mesaId: string;

  beforeEach(async () => {
    const r = await prepararBanco();
    sql = r.sql;
    mesaId = r.mesas[0].id;
    definirIAParaTestes(criarIaSimulada().transmissor);
  });
  afterEach(() => definirIAParaTestes(null));
  afterAll(async () => {
    await encerrarSql();
  });

  async function mesa() {
    return (await mesaPorId(sql, mesaId))!;
  }
  async function irParaFase(n: number) {
    while ((await mesa()).fase_atual < n) expect((await acaoDeFase(sql, mesaId, "forcar", GESTOR)).ok).toBe(true);
  }
  async function comSkill() {
    await salvarArquivo(sql, await mesa(), "SKILL.md", SKILL_SIMULADA, { autor: "ia" });
  }
  async function estado() {
    return montarEstadoMesa(sql, await mesa());
  }

  it("Fase 3: rodar, congelar com lacunas, guardar com índice e citação, salvar exemplo e segunda rodada", async () => {
    await irParaFase(3);
    await comSkill();
    let texto = "";
    const r1 = await rodar(sql, mesaId, "exemplo", (d) => (texto += d));
    expect(r1.ok).toBe(true);
    expect(texto).toContain("Olá, Bruno!");
    let s = await estado();
    expect(s.rodadas).toHaveLength(1);
    expect(s.rodadas[0].entrada).toContain("Cliente Bruno");

    // A IA propõe; nada é salvo antes da mesa confirmar (RN13).
    const proposta = await congelar(sql, mesaId, "Olá, Bruno! Segue o orçamento:\n30 cadeiras: R$ 1.350,00");
    expect(proposta.ok).toBe(true);
    expect((await estado()).arquivos.filter((a) => a.caminho.startsWith("arquivos/"))).toHaveLength(0);

    // Modelo sem lacuna é recusado.
    const semLacuna = await guardarModelo(sql, mesaId, { nomeArquivo: "modelo-x", praQueServe: "Teste.", conteudo: "Texto fixo." });
    expect(semLacuna).toMatchObject({ ok: false });

    const p = proposta.ok ? proposta.dados! : null;
    expect((await guardarModelo(sql, mesaId, { nomeArquivo: p!.nome_arquivo, praQueServe: p!.pra_que_serve, conteudo: p!.conteudo })).ok).toBe(true);
    const indice = await lerArquivo(sql, mesaId, "arquivos/INDICE.md");
    expect(indice!.conteudo).toContain("`modelo-mensagem-orcamento.md`: Responder um pedido de orçamento pelo WhatsApp.");
    const skill = await lerArquivo(sql, mesaId, "SKILL.md");
    expect(lerSecao(skill!.conteudo, "O que precisa")).toContain("arquivos/modelo-mensagem-orcamento.md");

    expect((await salvarExemplo(sql, mesaId, s.rodadas[0].id, "Olá, Bruno! Orçamento aprovado.")).ok).toBe(true);
    expect((await lerArquivo(sql, mesaId, "exemplos/bom-1.md"))!.conteudo).toContain("## Resultado");

    expect((await rodar(sql, mesaId, "segunda", () => {})).ok).toBe(true);
    s = await estado();
    const segunda = s.rodadas.find((x) => x.tipo === "segunda")!;
    expect(segunda.reusou[0].arquivo).toContain("modelo-mensagem-orcamento");

    const roteiro = await roteiroDoEvento(sql, s.evento.id);
    for (const passo of roteiro.passosPorFase.get(3)!) expect((await concluirPasso(sql, mesaId, passo.id)).ok).toBe(true);
    expect((await estado()).avaliacaoFase.ok).toBe(true);
  });

  it("Fase 4: conferência com 'profissional' ou sem fonte é recusada (RN08)", async () => {
    await irParaFase(4);
    await comSkill();
    expect((await salvarConferencia(sql, mesaId, { descricao: "A mensagem é profissional", fonte: "tabela" })).ok).toBe(true);
    expect((await salvarConferencia(sql, mesaId, { descricao: "O total bate com a soma", fonte: "" })).ok).toBe(true);
    const s = await estado();
    expect(s.conferencias.map((c) => c.valida)).toEqual([false, false]);
    expect(s.conferencias[0].motivo).toBe(
      "A palavra 'profissional' não dá para conferir. Troque por algo que se possa contar ou comparar",
    );
    expect(s.conferencias[1].motivo).toBe("Falta dizer contra qual fonte");
    expect(s.avaliacaoFase.ok).toBe(false);
  });

  it("Fase 4: importar do SKILL.md, 5 válidas, placar depois de rodar e Pronto quando sincronizado", async () => {
    await irParaFase(4);
    await comSkill();
    // A seção Pronto quando da skill simulada tem 1 item, sem fonte: entra recusado.
    expect((await importarDoSkill(sql, mesaId)).ok).toBe(true);
    let s = await estado();
    expect(s.conferencias).toHaveLength(1);
    expect(s.conferencias[0].valida).toBe(false);
    await removerConferencia(sql, mesaId, s.conferencias[0].id);

    const itens = [
      ["O total bate com a soma dos itens", "tabela de preços do kit"],
      ["O prazo é o da lista de bairros", "lista de prazos do kit"],
      ["A validade tem data", "calendário"],
      ["O nome do cliente aparece no começo", "mensagem do cliente"],
      ["O estoque foi conferido", "planilha de estoque"],
    ];
    for (const [descricao, fonte] of itens) {
      expect((await salvarConferencia(sql, mesaId, { descricao, fonte })).ok).toBe(true);
    }
    s = await estado();
    expect(s.conferencias.every((c) => c.valida)).toBe(true);
    const pronto = lerSecao(s.arquivos.find((a) => a.caminho === "SKILL.md")!.conteudo, "Pronto quando")!;
    expect(pronto.split("\n")).toHaveLength(5);
    expect(pronto).toContain("- [ ] O total bate com a soma dos itens (fonte: tabela de preços do kit)");

    // Sem rodar, o passo do placar não conclui.
    const roteiro = await roteiroDoEvento(sql, s.evento.id);
    const [escrever, rodarPasso] = roteiro.passosPorFase.get(4)!;
    expect((await concluirPasso(sql, mesaId, escrever.id)).ok).toBe(true);
    expect(await concluirPasso(sql, mesaId, rodarPasso.id)).toMatchObject({ ok: false, motivo: "Rodem a tarefa para ver o placar" });

    let texto = "";
    expect((await rodarProva(sql, mesaId, (d) => (texto += d))).ok).toBe(true);
    expect(texto).toContain("Olá, Carla!");
    s = await estado();
    const placar = s.rodadas.find((r) => r.tipo === "prova")!.placar!;
    expect(placar).toHaveLength(5);
    expect(placar.filter((p) => p.passou)).toHaveLength(4);
    expect(placar[4]).toMatchObject({ passou: false, conseguiuConferir: false });
    expect((await concluirPasso(sql, mesaId, rodarPasso.id)).ok).toBe(true);
  });

  it("dado sensível não entra numa conferência nem num modelo (RN14)", async () => {
    await irParaFase(4);
    const r = await salvarConferencia(sql, mesaId, { descricao: "Conferir o CPF 123.456.789-09", fonte: "cadastro" });
    expect(r).toMatchObject({ ok: false, motivo: "Isto parece um CPF. Troque por um dado fictício antes de guardar." });
  });
});
