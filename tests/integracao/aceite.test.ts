import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { encerrarSql, prepararBanco, URL_TESTE } from "../ajuda/banco";
import { cumprirCriterios } from "../ajuda/criterios";
import { lerZip } from "../ajuda/zip";
import type { Sql } from "@/lib/servidor/db";
import { acaoDeFase, ajustarTempo, concluirFase, concluirPasso, pedirAjuda, type Autor } from "@/lib/servidor/acoes";
import { mesaPorId, roteiroDoEvento } from "@/lib/servidor/consultas";
import { montarEstadoMesa } from "@/lib/servidor/estado-mesa";
import { montarPainel } from "@/lib/servidor/painel";
import { aprovarSkill, encerrarEntrevista, gerarSkill, turnoDaEntrevista } from "@/lib/servidor/entrevista";
import { editarSecao } from "@/lib/servidor/edicao";
import { congelar, guardarModelo, rodar, rodarProva, salvarExemplo } from "@/lib/servidor/rodadas";
import { salvarConferencia } from "@/lib/servidor/conferencias";
import { enviarRelatorio, observar, testar, trocarParceira } from "@/lib/servidor/teste";
import { aprovarConserto, escolherCamada, escolherFalha, proporConserto, rodarDepoisDoConserto } from "@/lib/servidor/conserto";
import { confirmarNome, marcarFinal, revisarQuandoUsar } from "@/lib/servidor/entrega";
import { zipDaSkill } from "@/lib/exportacao/pasta";
import { definirIAParaTestes } from "@/lib/ia/cliente";
import { criarIaSimulada } from "@/lib/ia/simulada";

// Critérios de aceite da seção 8 da especificação que dependem do servidor.
// O mapa completo, com os testes de navegador e o que é conferido à mão, está
// em docs/aceite.md.

const GESTOR: Autor = { perfil: "gestor", nome: "Gestora Aceite" };

describe.skipIf(!URL_TESTE)("critérios de aceite da seção 8", () => {
  let sql: Sql;
  let eventoId: string;
  let m1: string, m2: string;

  beforeEach(async () => {
    const r = await prepararBanco();
    sql = r.sql;
    eventoId = r.eventoId;
    [m1, m2] = r.mesas.map((m) => m.id);
    definirIAParaTestes(criarIaSimulada().transmissor);
  });
  afterEach(() => definirIAParaTestes(null));
  afterAll(async () => {
    await encerrarSql();
  });

  const mesa = async (id: string) => (await mesaPorId(sql, id))!;
  const estado = async (id: string) => montarEstadoMesa(sql, await mesa(id));

  /** Conclui todos os passos da fase atual e declara a fase. O gestor libera. */
  async function fecharFase(id: string) {
    const m = await mesa(id);
    const roteiro = await roteiroDoEvento(sql, m.evento_id);
    for (const p of roteiro.passosPorFase.get(m.fase_atual)!) {
      const r = await concluirPasso(sql, id, p.id);
      expect(r.ok, `Fase ${m.fase_atual}, ${p.chave}: ${r.ok ? "" : r.motivo}`).toBe(true);
    }
    const r = await concluirFase(sql, id);
    expect(r.ok, r.ok ? "" : r.motivo).toBe(true);
    expect((await mesa(id)).estado).toBe("pronta");
    expect((await acaoDeFase(sql, id, "avancar", GESTOR)).ok).toBe(true);
  }

  async function ate4(id: string) {
    // Fases 0 e 1: papéis, leitura e tarefa.
    for (let f = 0; f < 2; f++) {
      await cumprirCriterios(sql, id);
      await fecharFase(id);
    }
    // Fase 2: entrevista com 8 respostas, SKILL.md e aprovação.
    expect((await turnoDaEntrevista(sql, id, undefined, () => {})).ok).toBe(true);
    for (let i = 1; i <= 8; i++) expect((await turnoDaEntrevista(sql, id, `Resposta ${i}`, () => {})).ok).toBe(true);
    expect((await encerrarEntrevista(sql, id)).ok).toBe(true);
    expect((await gerarSkill(sql, id, () => {})).ok).toBe(true);
    expect((await aprovarSkill(sql, id)).ok).toBe(true);
    await fecharFase(id);
    // Fase 3: rodada, modelo, exemplo e segunda rodada.
    expect((await rodar(sql, id, "exemplo", () => {})).ok).toBe(true);
    const p = await congelar(sql, id, "Olá, Bruno!");
    const d = p.ok ? p.dados! : null;
    expect((await guardarModelo(sql, id, { nomeArquivo: d!.nome_arquivo, praQueServe: d!.pra_que_serve, conteudo: d!.conteudo })).ok).toBe(true);
    expect((await salvarExemplo(sql, id, (await estado(id)).rodadas[0].id, "Olá, Bruno! Orçamento.")).ok).toBe(true);
    expect((await rodar(sql, id, "segunda", () => {})).ok).toBe(true);
    await fecharFase(id);
    // Fase 4: 5 conferências válidas e placar.
    for (const [descricao, fonte] of [
      ["O total bate com a soma", "tabela do kit"],
      ["O prazo é o do bairro", "lista de prazos"],
      ["A validade tem data", "calendário"],
      ["O nome do cliente aparece", "caso"],
      ["Uma conferência que falha de propósito", "caso"],
    ]) {
      expect((await salvarConferencia(sql, id, { descricao, fonte })).ok).toBe(true);
    }
    expect((await rodarProva(sql, id, () => {})).ok).toBe(true);
    await fecharFase(id);
  }

  it("uma mesa percorre as 8 fases, sem forçar nada, e exporta o .zip completo", async () => {
    await ate4(m1);
    await ate4(m2);
    expect((await trocarParceira(sql, m1, m2, GESTOR)).ok).toBe(true);
    expect((await trocarParceira(sql, m2, m1, GESTOR)).ok).toBe(true);

    // Fase 5 nas duas mesas: testar, observar e enviar.
    for (const id of [m1, m2]) {
      expect((await testar(sql, id, () => {})).ok).toBe(true);
      const falha = (await estado(id)).teste!.rodada!.placar!.find((x) => !x.passou)!;
      expect((await observar(sql, id, falha.id, "Faltou o prazo.")).ok).toBe(true);
      expect((await enviarRelatorio(sql, id)).ok).toBe(true);
    }
    await fecharFase(m1);

    // Fase 6: conserto e nova rodada.
    const recebida = (await estado(m1)).teste!.recebido!.rodada!.placar!.find((x) => !x.passou)!;
    expect((await escolherFalha(sql, m1, { resultadoId: recebida.id })).ok).toBe(true);
    expect((await escolherCamada(sql, m1, "processo")).ok).toBe(true);
    expect((await proporConserto(sql, m1, () => {})).ok).toBe(true);
    expect((await aprovarConserto(sql, m1, {})).ok).toBe(true);
    expect((await rodarDepoisDoConserto(sql, m1, () => {})).ok).toBe(true);
    await fecharFase(m1);

    // Fase 7: nome, Quando usar e final.
    expect((await confirmarNome(sql, m1, "Orçamento pelo WhatsApp")).ok).toBe(true);
    expect((await revisarQuandoUsar(sql, m1)).ok).toBe(true);
    expect((await marcarFinal(sql, m1)).ok).toBe(true);
    const m = await mesa(m1);
    const roteiro = await roteiroDoEvento(sql, m.evento_id);
    for (const p of roteiro.passosPorFase.get(7)!) expect((await concluirPasso(sql, m1, p.id)).ok).toBe(true);
    expect((await concluirFase(sql, m1)).ok).toBe(true);

    // Nenhum avanço forçado no caminho.
    const forcados = await sql`select 1 from registro where mesa_id = ${m1} and acao = 'forcar'`;
    expect(forcados).toHaveLength(0);

    const z = (await zipDaSkill(sql, m1))!;
    const nomes = [...lerZip(z.zip).keys()];
    expect(nomes).toEqual(
      expect.arrayContaining([
        `${z.nome}/SKILL.md`,
        `${z.nome}/arquivos/INDICE.md`,
        `${z.nome}/exemplos/bom-1.md`,
        `${z.nome}/notas.md`,
      ]),
    );
  });

  it("o painel mostra em andamento, pronta, atrasada e pediu ajuda", async () => {
    const [, , m3] = (await sql<{ id: string }[]>`select id from mesa order by numero`).map((x) => x.id);
    await cumprirCriterios(sql, m1);
    const roteiro = await roteiroDoEvento(sql, eventoId);
    for (const p of roteiro.passosPorFase.get(0)!) await concluirPasso(sql, m1, p.id);
    await concluirFase(sql, m1);
    // Atrasada: o tempo da fase acabou (RN04). O ajuste de -60 min passa do limite da Fase 0.
    await ajustarTempo(sql, m2, -60, GESTOR);
    await pedirAjuda(sql, m3, true);
    const painel = (await montarPainel(sql, eventoId))!;
    const porId = new Map(painel.mesas.map((c) => [c.id, c]));
    expect(porId.get(m1)!.estadoMostrado).toBe("pronta");
    expect(porId.get(m2)!.estadoMostrado).toBe("atrasada");
    expect(porId.get(m3)!.estadoMostrado).toBe("em_andamento");
    expect(porId.get(m3)!.pediuAjuda).toBe(true);
    // Atrasada não bloqueia a mesa (RN04).
    expect((await concluirPasso(sql, m2, roteiro.passosPorFase.get(0)![0].id)).ok).toBe(true);
  });

  it("no teste cruzado, a mesa testadora vê a pasta da parceira, mas não edita", async () => {
    await ate4(m1);
    await ate4(m2);
    await trocarParceira(sql, m1, m2, GESTOR);
    for (const id of [m1, m2]) while ((await mesa(id)).fase_atual < 5) await acaoDeFase(sql, id, "forcar", GESTOR);
    const antes = (await estado(m2)).arquivos.find((a) => a.caminho === "SKILL.md")!;
    const visto = (await estado(m1)).teste!.pastaParceira.find((a) => a.caminho === "SKILL.md")!;
    expect(visto.conteudo).toBe(antes.conteudo);
    // Toda edição é feita com a mesa da própria tela: não há como mudar a pasta da parceira.
    const r = await editarSecao(sql, m1, "SKILL.md", "Passos", "Mudança da testadora", visto.versao);
    expect(r.ok).toBe(false);
    const depois = (await estado(m2)).arquivos.find((a) => a.caminho === "SKILL.md")!;
    expect(depois.versao).toBe(antes.versao);
    expect(depois.conteudo).toBe(antes.conteudo);
  });
});
