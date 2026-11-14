import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { encerrarSql, prepararBanco, URL_TESTE } from "../ajuda/banco";
import type { Sql } from "@/lib/servidor/db";
import {
  acaoDeFase,
  ajustarTempo,
  avancarProntas,
  avancarTodas,
  concluirFase,
  concluirPasso,
  configurarEvento,
  irParaPasso,
  pausarTodas,
  pedirAjuda,
  atenderChamado,
  retomarTodas,
  type Autor,
} from "@/lib/servidor/acoes";
import { mesaPorId, roteiroDoEvento } from "@/lib/servidor/consultas";
import { cumprirCriterios } from "../ajuda/criterios";
import { montarEstadoMesa } from "@/lib/servidor/estado-mesa";
import { montarPainel } from "@/lib/servidor/painel";
import { emissorLocal } from "@/lib/servidor/sinais";
import { canalMesa, type Sinal } from "@/lib/sinais";

const GESTOR: Autor = { perfil: "gestor", nome: "Gestora Teste" };
const FACILITADOR: Autor = { perfil: "facilitador", nome: "Facilitador Teste" };

describe.skipIf(!URL_TESTE)("fases da mesa no banco", () => {
  let sql: Sql;
  let eventoId: string;
  let m1: string, m2: string, m3: string;

  beforeEach(async () => {
    const r = await prepararBanco();
    sql = r.sql;
    eventoId = r.eventoId;
    [m1, m2, m3] = r.mesas.map((m) => m.id);
  });

  afterAll(async () => {
    await encerrarSql();
  });

  async function concluirTodosOsPassos(mesaId: string) {
    await cumprirCriterios(sql, mesaId);
    const mesa = await mesaPorId(sql, mesaId);
    const roteiro = await roteiroDoEvento(sql, mesa!.evento_id);
    for (const p of roteiro.passosPorFase.get(mesa!.fase_atual) ?? []) {
      const r = await concluirPasso(sql, mesaId, p.id);
      expect(r.ok).toBe(true);
    }
  }

  async function registros(mesaId: string) {
    return sql<{ acao: string; autor_perfil: string; autor_nome: string }[]>`
      select acao, autor_perfil, autor_nome from registro where mesa_id = ${mesaId} order by criado_em`;
  }

  it("avançar uma mesa muda só ela e avisa só o canal dela", async () => {
    const recebidos: Record<string, Sinal[]> = { [m1]: [], [m2]: [] };
    const ouvir = (id: string) => (s: Sinal) => recebidos[id].push(s);
    const o1 = ouvir(m1);
    const o2 = ouvir(m2);
    emissorLocal().on(canalMesa(m1), o1);
    emissorLocal().on(canalMesa(m2), o2);

    await concluirTodosOsPassos(m1);
    expect((await concluirFase(sql, m1)).ok).toBe(true);
    expect((await mesaPorId(sql, m1))!.estado).toBe("pronta");
    recebidos[m1].length = 0;
    expect((await acaoDeFase(sql, m1, "avancar", GESTOR)).ok).toBe(true);

    emissorLocal().off(canalMesa(m1), o1);
    emissorLocal().off(canalMesa(m2), o2);

    const [a, b, c] = await Promise.all([mesaPorId(sql, m1), mesaPorId(sql, m2), mesaPorId(sql, m3)]);
    expect([a!.fase_atual, b!.fase_atual, c!.fase_atual]).toEqual([1, 0, 0]);
    expect(a!.estado).toBe("em_andamento");
    expect(a!.passo_atual).toBe(1);
    expect(recebidos[m1].length).toBeGreaterThan(0);
    expect(recebidos[m2]).toEqual([]);
  });

  it("a mesa não recebe nem abre o conteúdo de fase não liberada", async () => {
    const mesa = (await mesaPorId(sql, m1))!;
    const estado = await montarEstadoMesa(sql, mesa);
    expect(estado.fases[0].situacao).toBe("atual");
    for (const f of estado.fases.slice(1)) {
      expect(f.situacao).toBe("bloqueada");
      expect(f.passos).toEqual([]);
      expect(f.aprofundamento).toBeNull();
    }
    const roteiro = await roteiroDoEvento(sql, eventoId);
    const passoDaFase1 = roteiro.passosPorFase.get(1)![0];
    const r = await concluirPasso(sql, m1, passoDaFase1.id);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.status).toBe(403);
    // Não pode pular passos da fase atual.
    const pulo = await irParaPasso(sql, m1, 3);
    expect(pulo.ok).toBe(false);
  });

  it("RN01 e RN03: a mesa não conclui a fase com passo pendente e não avança sozinha", async () => {
    const r = await concluirFase(sql, m1);
    expect(r.ok).toBe(false);
    await concluirTodosOsPassos(m1);
    expect((await concluirFase(sql, m1)).ok).toBe(true);
    const mesa = (await mesaPorId(sql, m1))!;
    expect(mesa.fase_atual).toBe(0);
    expect(mesa.estado).toBe("pronta");
  });

  it("RN02: no modo automático, a mesa pronta avança sem o gestor", async () => {
    await configurarEvento(sql, eventoId, { modoLiberacao: "automatico" }, GESTOR);
    await concluirTodosOsPassos(m1);
    expect((await concluirFase(sql, m1)).ok).toBe(true);
    const mesa = (await mesaPorId(sql, m1))!;
    expect(mesa.fase_atual).toBe(1);
    const acoes = (await registros(m1)).map((r) => `${r.acao}:${r.autor_perfil}`);
    expect(acoes).toEqual(["concluir_fase:mesa", "avancar:sistema"]);
  });

  it("forçar avança sem critério e fica registrado com autor (RN16)", async () => {
    expect((await acaoDeFase(sql, m2, "avancar", GESTOR)).ok).toBe(false);
    expect((await acaoDeFase(sql, m2, "forcar", FACILITADOR)).ok).toBe(true);
    expect((await mesaPorId(sql, m2))!.fase_atual).toBe(1);
    expect(await registros(m2)).toEqual([
      { acao: "forcar", autor_perfil: "facilitador", autor_nome: "Facilitador Teste" },
    ]);
  });

  it("RN05: voltar fase não apaga nada e marca a fase como reaberta", async () => {
    await concluirTodosOsPassos(m1);
    await concluirFase(sql, m1);
    await acaoDeFase(sql, m1, "avancar", GESTOR);
    const antes = await sql`select count(*)::int as n from passo_concluido where mesa_id = ${m1}`;
    expect((await acaoDeFase(sql, m1, "voltar", GESTOR)).ok).toBe(true);
    const depois = await sql`select count(*)::int as n from passo_concluido where mesa_id = ${m1}`;
    expect(depois[0].n).toBe(antes[0].n);
    const mesa = (await mesaPorId(sql, m1))!;
    expect(mesa.fase_atual).toBe(0);
    expect(mesa.reaberta_em).not.toBeNull();
    // Todos os passos da fase reaberta já estavam concluídos: entra no último.
    expect(mesa.passo_atual).toBe(3);
    expect((await registros(m1)).map((r) => r.acao)).toEqual(["concluir_fase", "avancar", "voltar"]);
  });

  it("avançar todas muda só as mesas da fase de referência", async () => {
    await acaoDeFase(sql, m3, "forcar", GESTOR); // m3 vai para a Fase 1
    await concluirTodosOsPassos(m1);
    await concluirFase(sql, m1); // m1 pronta na Fase 0
    const r = await avancarTodas(sql, eventoId, GESTOR);
    expect(r.ok).toBe(true);
    const fases = await Promise.all([m1, m2, m3].map(async (id) => (await mesaPorId(sql, id))!.fase_atual));
    expect(fases).toEqual([1, 1, 1]);
    // m3 estava na Fase 1, fora da referência: não mudou.
    const ev = await sql`select fase_referencia from evento where id = ${eventoId}`;
    expect(ev[0].fase_referencia).toBe(1);
    expect((await registros(m1)).at(-1)?.acao).toBe("avancar");
    expect((await registros(m2)).at(-1)?.acao).toBe("forcar");
  });

  it("avançar prontas libera só as mesas prontas", async () => {
    await concluirTodosOsPassos(m2);
    await concluirFase(sql, m2);
    const r = await avancarProntas(sql, eventoId, GESTOR);
    expect(r.ok && r.dados?.afetadas).toBe(1);
    const fases = await Promise.all([m1, m2, m3].map(async (id) => (await mesaPorId(sql, id))!.fase_atual));
    expect(fases).toEqual([0, 1, 0]);
  });

  it("pausar todas congela o cronômetro e retomar devolve o estado anterior", async () => {
    await concluirTodosOsPassos(m1);
    await concluirFase(sql, m1);
    expect((await pausarTodas(sql, eventoId, 10, GESTOR)).ok).toBe(true);
    const pausadas = await sql`select estado from mesa where evento_id = ${eventoId}`;
    expect(pausadas.every((m) => m.estado === "pausada")).toBe(true);
    const painel = await montarPainel(sql, eventoId);
    expect(painel!.evento.pausaGeralAte).not.toBeNull();
    await sql`update mesa set pausada_desde = pausada_desde - interval '90 seconds'`;
    expect((await retomarTodas(sql, eventoId, GESTOR)).ok).toBe(true);
    const mesa = (await mesaPorId(sql, m1))!;
    expect(mesa.estado).toBe("pronta");
    expect(mesa.pausa_acumulada_s).toBeGreaterThanOrEqual(90);
    expect((await mesaPorId(sql, m2))!.estado).toBe("em_andamento");
  });

  it("ajustar tempo soma minutos na fase atual", async () => {
    expect((await ajustarTempo(sql, m1, 5, GESTOR)).ok).toBe(true);
    expect((await ajustarTempo(sql, m1, -2, GESTOR)).ok).toBe(true);
    expect((await mesaPorId(sql, m1))!.ajuste_tempo_s).toBe(180);
    expect((await ajustarTempo(sql, m1, 0, GESTOR)).ok).toBe(false);
  });

  it("desfazer um avanço recente devolve a mesa pronta à fase anterior", async () => {
    await concluirTodosOsPassos(m1);
    await concluirFase(sql, m1);
    await acaoDeFase(sql, m1, "avancar", GESTOR);
    expect((await acaoDeFase(sql, m1, "desfazer_avanco", GESTOR)).ok).toBe(true);
    const mesa = (await mesaPorId(sql, m1))!;
    expect([mesa.fase_atual, mesa.estado, mesa.passo_atual]).toEqual([0, "pronta", 3]);
    // Não dá para desfazer duas vezes.
    expect((await acaoDeFase(sql, m1, "desfazer_avanco", GESTOR)).ok).toBe(false);
  });

  it("pedido de ajuda aparece no painel até ser atendido", async () => {
    await pedirAjuda(sql, m2, true);
    await pedirAjuda(sql, m2, true); // não duplica
    let painel = await montarPainel(sql, eventoId);
    const cartao = painel!.mesas.find((m) => m.id === m2)!;
    expect(cartao.pediuAjuda).toBe(true);
    expect((await atenderChamado(sql, cartao.chamadoId!, FACILITADOR)).ok).toBe(true);
    painel = await montarPainel(sql, eventoId);
    expect(painel!.mesas.find((m) => m.id === m2)!.pediuAjuda).toBe(false);
  });

  it("RN06: alterar um arquivo guarda o histórico e mantém uma única versão", async () => {
    await sql`insert into arquivo (mesa_id, caminho, conteudo, fase_alterada) values (${m1}, 'SKILL.md', 'v1', 2)`;
    await sql`update arquivo set conteudo = 'v2', fase_alterada = 3 where mesa_id = ${m1} and caminho = 'SKILL.md'`;
    await sql`update arquivo set fase_alterada = 3 where mesa_id = ${m1} and caminho = 'SKILL.md'`;
    const arquivos = await sql`select versao, conteudo from arquivo where mesa_id = ${m1}`;
    expect(arquivos).toEqual([{ versao: 2, conteudo: "v2" }]);
    const historico = await sql`
      select v.versao, v.conteudo, v.fase from arquivo_versao v join arquivo a on a.id = v.arquivo_id
      where a.mesa_id = ${m1} order by v.versao`;
    expect(historico).toEqual([
      { versao: 1, conteudo: "v1", fase: 2 },
      { versao: 2, conteudo: "v2", fase: 3 },
    ]);
    await expect(
      sql`insert into arquivo (mesa_id, caminho, conteudo, fase_alterada) values (${m1}, 'SKILL.md', 'outra', 2)`,
    ).rejects.toThrow();
  });
});
