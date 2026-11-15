import { describe, expect, it } from "vitest";
import {
  DEFINICAO_PAPEIS,
  DURACAO_INTERVALO_MIN,
  FASES,
  MINIMO_PERGUNTAS,
  PAPEIS,
  TEMAS_ENTREVISTA,
  TIPOS_ATIVIDADE,
  atividadePronta,
  avaliarFase,
  avaliarPasso,
  marcoDaAtividade,
  problemaDaTarefa,
} from "@/lib/jornada";

const todosOsTextos = FASES.flatMap((f) => [
  f.nome,
  f.nomeCurto,
  f.entrega,
  f.criterioTexto,
  f.aprofundamento,
  f.rotuloContribuicao ?? "",
  ...f.passos.map((p) => p.instrucao),
]);

describe("jornada em dados", () => {
  it("tem 8 fases, de 0 a 7, em ordem", () => {
    expect(FASES.map((f) => f.ordem)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("soma 180 minutos com o intervalo (seção 3)", () => {
    expect(FASES.map((f) => f.duracaoMin)).toEqual([10, 15, 35, 25, 20, 30, 20, 15]);
    expect(FASES.reduce((s, f) => s + f.duracaoMin, 0) + DURACAO_INTERVALO_MIN).toBe(180);
  });

  it("cada passo tem papel e tipo de atividade válidos e chave única na fase", () => {
    for (const f of FASES) {
      expect(f.passos.length).toBeGreaterThan(0);
      expect(new Set(f.passos.map((p) => p.chave)).size).toBe(f.passos.length);
      for (const p of f.passos) {
        expect([...PAPEIS, "mesa"]).toContain(p.papel);
        expect(TIPOS_ATIVIDADE).toContain(p.tipo);
        expect(p.criterio).toBeTruthy();
      }
    }
  });

  it("tem os 6 papéis e os 8 temas da entrevista", () => {
    expect(DEFINICAO_PAPEIS.map((p) => p.papel)).toEqual([...PAPEIS]);
    expect(TEMAS_ENTREVISTA).toHaveLength(8);
    expect(MINIMO_PERGUNTAS).toBe(8);
  });

  it("textos sem travessões e sem palavras em caixa alta", () => {
    for (const t of todosOsTextos) {
      expect(t).not.toMatch(/[–—]/);
      const palavrasAltas = t.match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{3,}\b/g) ?? [];
      // Nomes de arquivo como SKILL.md e INDICE.md são permitidos.
      expect(palavrasAltas.filter((p) => !["SKILL", "INDICE"].includes(p))).toEqual([]);
    }
  });

  it("fase não fecha com passo pendente (RN03)", () => {
    const passos = FASES[0].passos.map((p, i) => ({ id: `p${i}`, ordem: i + 1, tipo: p.tipo, criterio: p.criterio }));
    const r = avaliarFase(FASES[0], passos, { concluidos: new Set(["p0"]) });
    expect(r).toEqual({ ok: false, falta: "Faltam 2 passos" });
    // Com os passos concluídos, a Fase 0 ainda exige os 6 papéis com nome.
    const todos = new Set(["p0", "p1", "p2"]);
    expect(avaliarFase(FASES[0], passos, { concluidos: todos })).toEqual({ ok: false, falta: "Faltam 6 papéis sem nome" });
    expect(avaliarFase(FASES[0], passos, { concluidos: todos, papeisComNome: new Set(PAPEIS) }).ok).toBe(true);
  });

  it("papéis: o passo de distribuir só conclui com os 6 papéis com nome", () => {
    const distribuir = FASES[0].passos.find((p) => p.chave === "distribuir")!;
    const passo = { id: "d", ordem: 2, tipo: distribuir.tipo, criterio: distribuir.criterio, config: distribuir.config };
    const cinco = new Set(PAPEIS.slice(0, 5));
    expect(avaliarPasso(passo, { concluidos: new Set(), papeisComNome: cinco })).toEqual({
      ok: false,
      falta: "Falta dar nome a 1 papel",
    });
    expect(avaliarPasso(passo, { concluidos: new Set(), papeisComNome: new Set(PAPEIS) }).ok).toBe(true);
  });

  it("Fase 1: leitura pede Lemos e a fase pede a tarefa confirmada", () => {
    const passos = FASES[1].passos.map((p, i) => ({
      id: `q${i}`,
      ordem: i + 1,
      tipo: p.tipo,
      criterio: p.criterio,
      config: p.config,
    }));
    const ficha = passos.find((p) => p.config?.conteudo === "ficha")!;
    expect(avaliarPasso(ficha, { concluidos: new Set() }).ok).toBe(false);
    expect(avaliarPasso(ficha, { concluidos: new Set(), lidos: new Set([ficha.id]) }).ok).toBe(true);

    const todos = new Set(passos.map((p) => p.id));
    const lidos = new Set(passos.filter((p) => p.criterio === "lido").map((p) => p.id));
    expect(avaliarFase(FASES[1], passos, { concluidos: todos, lidos }).ok).toBe(false);
    expect(avaliarFase(FASES[1], passos, { concluidos: todos, lidos, tarefa: "Responder pedido com preço e prazo" }).ok).toBe(true);
  });

  it("todas as atividades do roteiro estão construídas", () => {
    for (const f of FASES) for (const p of f.passos) expect(atividadePronta(p), `${f.ordem}:${p.chave}`).toBe(true);
    const nome = FASES[7].passos.find((p) => p.chave === "nome")!;
    expect(marcoDaAtividade(nome)).toBe(2);
  });

  it("tarefa em uma linha: até 90 caracteres e com pelo menos três palavras", () => {
    expect(problemaDaTarefa("")).not.toBeNull();
    expect(problemaDaTarefa("Orçamento")).not.toBeNull();
    expect(problemaDaTarefa("a ".repeat(50))).not.toBeNull();
    expect(problemaDaTarefa("Responder pedido de orçamento com preço e prazo")).toBeNull();
  });
});
