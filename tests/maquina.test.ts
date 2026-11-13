import { describe, expect, it } from "vitest";
import { passoDeEntrada, transicao, type EstadoFaseMesa } from "@/lib/maquina";

const base: EstadoFaseMesa = { fase: 2, estado: "em_andamento", estadoAntesPausa: null, final: false };

describe("máquina de estados da mesa", () => {
  it("RN01: concluir a fase só deixa a mesa pronta, sem mudar de fase", () => {
    const r = transicao(base, { tipo: "concluir_fase", criteriosOk: true, modo: "manual" });
    expect(r.ok && r.novo).toEqual({ ...base, estado: "pronta" });
  });

  it("RN03: concluir a fase sem os critérios é recusado", () => {
    const r = transicao(base, { tipo: "concluir_fase", criteriosOk: false, modo: "manual" });
    expect(r.ok).toBe(false);
  });

  it("RN02: no modo automático, a mesa pronta avança sem esperar", () => {
    const r = transicao(base, { tipo: "concluir_fase", criteriosOk: true, modo: "automatico" });
    expect(r.ok && r.novo.fase).toBe(3);
    expect(r.ok && r.efeitos.avancoAutomatico).toBe(true);
  });

  it("avançar exige mesa pronta; forçar não exige", () => {
    expect(transicao(base, { tipo: "avancar" }).ok).toBe(false);
    const f = transicao(base, { tipo: "forcar" });
    expect(f.ok && f.novo.fase).toBe(3);
    const a = transicao({ ...base, estado: "pronta" }, { tipo: "avancar" });
    expect(a.ok && a.novo).toEqual({ ...base, fase: 3, estado: "em_andamento" });
  });

  it("não passa da última fase nem volta antes da primeira", () => {
    expect(transicao({ ...base, fase: 7 }, { tipo: "forcar" }).ok).toBe(false);
    expect(transicao({ ...base, fase: 0 }, { tipo: "voltar" }).ok).toBe(false);
  });

  it("voltar reabre a fase anterior e marca como reaberta", () => {
    const r = transicao({ ...base, estado: "pronta" }, { tipo: "voltar" });
    expect(r.ok && r.novo).toEqual({ ...base, fase: 1, estado: "em_andamento" });
    expect(r.ok && r.efeitos.reaberta).toBe(true);
  });

  it("pausar guarda o estado anterior e retomar devolve", () => {
    const p = transicao({ ...base, estado: "pronta" }, { tipo: "pausar" });
    expect(p.ok && p.novo).toEqual({ ...base, estado: "pausada", estadoAntesPausa: "pronta" });
    if (!p.ok) return;
    const r = transicao(p.novo, { tipo: "retomar" });
    expect(r.ok && r.novo.estado).toBe("pronta");
  });

  it("mesa pausada não avança, não volta e não conclui", () => {
    const pausada: EstadoFaseMesa = { ...base, estado: "pausada", estadoAntesPausa: "em_andamento" };
    for (const tipo of ["avancar", "forcar", "voltar"] as const) {
      expect(transicao(pausada, { tipo }).ok).toBe(false);
    }
    expect(transicao(pausada, { tipo: "concluir_fase", criteriosOk: true, modo: "manual" }).ok).toBe(false);
  });

  it("desfazer avanço volta à fase anterior já pronta", () => {
    const r = transicao(base, { tipo: "desfazer_avanco" });
    expect(r.ok && r.novo).toEqual({ ...base, fase: 1, estado: "pronta" });
  });
});

describe("passo de entrada na fase", () => {
  it("é o primeiro não concluído, ou o último se todos foram concluídos", () => {
    expect(passoDeEntrada([1, 2, 3], new Set())).toBe(1);
    expect(passoDeEntrada([1, 2, 3], new Set([1]))).toBe(2);
    expect(passoDeEntrada([1, 2, 3], new Set([1, 2, 3]))).toBe(3);
  });
});
