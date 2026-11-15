import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { encerrarSql, prepararBanco, URL_TESTE } from "../ajuda/banco";
import { lerZip } from "../ajuda/zip";
import type { Sql } from "@/lib/servidor/db";
import { acaoDeFase, concluirPasso, type Autor } from "@/lib/servidor/acoes";
import { mesaPorId, roteiroDoEvento } from "@/lib/servidor/consultas";
import { montarEstadoMesa } from "@/lib/servidor/estado-mesa";
import { salvarArquivo } from "@/lib/servidor/arquivos";
import { guardarModelo, salvarExemplo, rodar } from "@/lib/servidor/rodadas";
import { salvarConferencia } from "@/lib/servidor/conferencias";
import { calcularPares, enviarRelatorio, formarPares, observar, testar, trocarParceira } from "@/lib/servidor/teste";
import { aprovarConserto, escolherCamada, escolherFalha, proporConserto, rodarDepoisDoConserto } from "@/lib/servidor/conserto";
import { confirmarNome, destravarSkill, marcarFinal, revisarQuandoUsar } from "@/lib/servidor/entrega";
import { zipConsolidado, zipDaSkill } from "@/lib/exportacao/pasta";
import { definirIAParaTestes } from "@/lib/ia/cliente";
import { criarIaSimulada, SKILL_SIMULADA } from "@/lib/ia/simulada";

const GESTOR: Autor = { perfil: "gestor", nome: "Gestora Teste" };

describe("pares do teste cruzado (RN10)", () => {
  it("pares em ordem e trio em ciclo com número ímpar", () => {
    expect(calcularPares(["a", "b", "c", "d"])).toEqual([
      { autora: "a", testadora: "b" },
      { autora: "b", testadora: "a" },
      { autora: "c", testadora: "d" },
      { autora: "d", testadora: "c" },
    ]);
    const trio = calcularPares(["a", "b", "c"]);
    expect(trio).toEqual([
      { testadora: "a", autora: "b" },
      { testadora: "b", autora: "c" },
      { testadora: "c", autora: "a" },
    ]);
    expect(calcularPares(["a", "b", "c", "d", "e"])).toHaveLength(5);
  });
});

describe.skipIf(!URL_TESTE)("Marco 5: teste cruzado, conserto, entrega e exportação", () => {
  let sql: Sql;
  let eventoId: string;
  let m1: string, m2: string, m3: string;

  beforeEach(async () => {
    const r = await prepararBanco();
    sql = r.sql;
    eventoId = r.eventoId;
    [m1, m2, m3] = r.mesas.map((m) => m.id);
    definirIAParaTestes(criarIaSimulada().transmissor);
  });
  afterEach(() => definirIAParaTestes(null));
  afterAll(async () => {
    await encerrarSql();
  });

  const mesa = async (id: string) => (await mesaPorId(sql, id))!;
  const estado = async (id: string) => montarEstadoMesa(sql, await mesa(id));
  async function irParaFase(id: string, n: number) {
    while ((await mesa(id)).fase_atual < n) expect((await acaoDeFase(sql, id, "forcar", GESTOR)).ok).toBe(true);
  }
  async function concluirFaseInteira(id: string) {
    const m = await mesa(id);
    const roteiro = await roteiroDoEvento(sql, m.evento_id);
    for (const p of roteiro.passosPorFase.get(m.fase_atual)!) {
      const r = await concluirPasso(sql, id, p.id);
      expect(r.ok, r.ok ? "" : r.motivo).toBe(true);
    }
  }

  /** Mesa com pasta pronta para testar: SKILL.md, um modelo, um exemplo e 5 conferências. */
  async function prepararPasta(id: string) {
    await irParaFase(id, 3);
    await salvarArquivo(sql, await mesa(id), "SKILL.md", SKILL_SIMULADA, { autor: "ia" });
    expect((await rodar(sql, id, "exemplo", () => {})).ok).toBe(true);
    const r = (await estado(id)).rodadas[0];
    expect((await guardarModelo(sql, id, { nomeArquivo: "modelo-mensagem", praQueServe: "Mensagem de orçamento.", conteudo: "Olá, [nome]!" })).ok).toBe(true);
    expect((await salvarExemplo(sql, id, r.id, "Olá, Bruno!")).ok).toBe(true);
    await irParaFase(id, 4);
    const itens = [
      ["O total bate com a soma", "tabela do kit"],
      ["O prazo é o do bairro", "lista de prazos"],
      ["A validade tem data", "calendário"],
      ["O nome do cliente aparece", "caso"],
      ["Uma conferência que falha de propósito", "caso"],
    ];
    for (const [descricao, fonte] of itens) expect((await salvarConferencia(sql, id, { descricao, fonte })).ok).toBe(true);
  }

  it("duas mesas completam o teste cruzado entre si e o .zip sai com tudo", async () => {
    await prepararPasta(m1);
    await prepararPasta(m2);
    expect((await formarPares(sql, eventoId, GESTOR)).ok).toBe(true);
    expect((await formarPares(sql, eventoId, GESTOR)).ok).toBe(false);
    // Com 3 mesas, o ciclo é 1 testa 2, 2 testa 3, 3 testa 1. O gestor troca para 1 e 2 entre si (RN11).
    expect((await trocarParceira(sql, m2, m1, GESTOR)).ok).toBe(true);
    expect((await trocarParceira(sql, m2, m2, GESTOR)).ok).toBe(false);

    await irParaFase(m1, 5);
    // RN10: a Mesa 02 ainda está na Fase 4.
    let e1 = await estado(m1);
    expect(e1.teste?.parceira?.id).toBe(m2);
    expect(e1.teste?.liberado).toBe(false);
    expect(e1.teste?.pastaParceira).toEqual([]);
    expect((await testar(sql, m1, () => {})).ok).toBe(false);

    await irParaFase(m2, 5);
    e1 = await estado(m1);
    expect(e1.teste?.liberado).toBe(true);
    // RN09: a pasta da parceira chega em leitura, sem a conversa.
    expect(e1.teste?.pastaParceira.map((a) => a.caminho)).toContain("SKILL.md");
    await sql`insert into mensagem (mesa_id, autor, texto, fase, tipo) values (${m2}, 'mesa', 'CONVERSA SECRETA DA MESA 02', 2, 'resposta')`;
    expect(JSON.stringify(await estado(m1))).not.toContain("CONVERSA SECRETA");

    for (const [testadora] of [[m1], [m2]]) {
      expect((await testar(sql, testadora, () => {})).ok).toBe(true);
      const s = await estado(testadora);
      const placar = s.teste!.rodada!.placar!;
      expect(placar.filter((p) => !p.passou)).toHaveLength(1);
      expect((await enviarRelatorio(sql, testadora)).ok).toBe(false);
      const falha = placar.find((p) => !p.passou)!;
      expect((await observar(sql, testadora, falha.id, "A mensagem não trazia o prazo.")).ok).toBe(true);
      expect((await enviarRelatorio(sql, testadora)).ok).toBe(true);
    }
    e1 = await estado(m1);
    expect(e1.teste?.recebido?.testadora).toBe("Mesa 02");
    expect(e1.teste?.recebido?.rodada?.placar?.find((p) => !p.passou)?.observacao).toBe("A mensagem não trazia o prazo.");
    await concluirFaseInteira(m1);
    expect((await estado(m1)).avaliacaoFase.ok).toBe(true);

    // Fase 6: conserto na camada processo.
    await irParaFase(m1, 6);
    const falhaRecebida = e1.teste!.recebido!.rodada!.placar!.find((p) => !p.passou)!;
    expect((await escolherFalha(sql, m1, { resultadoId: falhaRecebida.id })).ok).toBe(true);
    expect((await proporConserto(sql, m1, () => {})).ok).toBe(false);
    expect((await escolherCamada(sql, m1, "processo")).ok).toBe(true);
    expect((await proporConserto(sql, m1, () => {})).ok).toBe(true);
    expect((await rodarDepoisDoConserto(sql, m1, () => {})).ok).toBe(false);
    expect((await aprovarConserto(sql, m1, {})).ok).toBe(true);
    let s1 = await estado(m1);
    expect(s1.arquivos.find((a) => a.caminho === "SKILL.md")!.conteudo).toContain("Escreva sempre o prazo do bairro.");
    const notas = s1.arquivos.find((a) => a.caminho === "notas.md")!.conteudo;
    expect(notas).toMatch(/^# Notas de conserto/);
    expect(notas).toContain("- O que mudou: O passo de escrever a mensagem passa a exigir o prazo do bairro.");
    expect((await rodarDepoisDoConserto(sql, m1, () => {})).ok).toBe(true);
    s1 = await estado(m1);
    expect(s1.conserto?.rodadaAntes?.placar).toHaveLength(5);
    expect(s1.conserto?.rodadaDepois?.placar).toHaveLength(5);
    await concluirFaseInteira(m1);
    expect((await estado(m1)).avaliacaoFase.ok).toBe(true);

    // Fase 7: nome, Quando usar e final (RN15).
    await irParaFase(m1, 7);
    expect((await confirmarNome(sql, m1, "Orçamento pelo WhatsApp com Claude")).ok).toBe(true);
    expect((await revisarQuandoUsar(sql, m1)).ok).toBe(true);
    expect((await marcarFinal(sql, m1)).ok).toBe(true);
    s1 = await estado(m1);
    expect(s1.mesa.final).toBe(true);
    expect(s1.entrega?.nomePasta).toBe("orcamento-pelo-whatsapp-com");
    const travado = await salvarArquivo(sql, await mesa(m1), "notas.md", "x", { autor: "mesa" });
    expect(travado.ok).toBe(false);
    await concluirFaseInteira(m1);
    expect((await estado(m1)).avaliacaoFase.ok).toBe(true);

    // Exportação: SKILL.md com cabeçalho, INDICE.md, um exemplo e notas.md.
    const z = (await zipDaSkill(sql, m1))!;
    const arquivos = lerZip(z.zip);
    const nome = z.nome;
    expect([...arquivos.keys()]).toEqual(
      expect.arrayContaining([
        `${nome}/SKILL.md`,
        `${nome}/arquivos/INDICE.md`,
        `${nome}/arquivos/modelo-mensagem.md`,
        `${nome}/exemplos/bom-1.md`,
        `${nome}/notas.md`,
        `${nome}/LEIA-ME.md`,
      ]),
    );
    const skill = arquivos.get(`${nome}/SKILL.md`)!;
    expect(skill).toMatch(new RegExp(`^---\\nname: ${nome}\\ndescription: ".+"\\n---\\n\\n# `));
    expect(nome).toMatch(/^[a-z0-9-]{1,64}$/);
    expect(nome).not.toContain("claude");
    // A exportação não leva a conversa nem os nomes dos participantes.
    expect([...arquivos.values()].join("\n")).not.toContain("Resposta do grupo");

    const consolidado = lerZip(await zipConsolidado(sql, eventoId));
    expect([...consolidado.keys()]).toEqual(
      expect.arrayContaining(["skills-sebrae-inovapb/LEIA-ME.md", `skills-sebrae-inovapb/zips/${nome}.zip`]),
    );

    // Só o gestor destrava (RN15).
    expect((await destravarSkill(sql, m1, GESTOR)).ok).toBe(true);
    expect((await mesa(m1)).final).toBe(false);
    void m3;
  });
});
