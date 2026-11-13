import { describe, expect, it } from "vitest";
import { estadoMostrado, formatarCronometro, segundosRestantesFase } from "@/lib/tempo";

const inicio = Date.parse("2026-12-03T13:00:00Z");

describe("cronômetro da fase", () => {
  it("desconta o tempo passado", () => {
    const r = { faseIniciadaEm: new Date(inicio), pausadaDesde: null, pausaAcumuladaS: 0, ajusteTempoS: 0 };
    expect(segundosRestantesFase(r, 10, inicio + 60_000)).toBe(540);
  });

  it("não conta o tempo pausado, nem a pausa em curso", () => {
    const r = {
      faseIniciadaEm: new Date(inicio),
      pausadaDesde: new Date(inicio + 120_000),
      pausaAcumuladaS: 60,
      ajusteTempoS: 0,
    };
    // 5 min depois do início: 2 min contados antes da pausa, 1 min de pausa antiga descontado.
    expect(segundosRestantesFase(r, 10, inicio + 300_000)).toBe(600 - 120 + 60);
  });

  it("soma o ajuste de tempo do gestor", () => {
    const r = { faseIniciadaEm: new Date(inicio), pausadaDesde: null, pausaAcumuladaS: 0, ajusteTempoS: 300 };
    expect(segundosRestantesFase(r, 10, inicio)).toBe(900);
  });

  it("RN04: tempo esgotado mostra atrasada, mas só para mesa em andamento", () => {
    expect(estadoMostrado("em_andamento", -1)).toBe("atrasada");
    expect(estadoMostrado("em_andamento", 0)).toBe("em_andamento");
    expect(estadoMostrado("pronta", -100)).toBe("pronta");
    expect(estadoMostrado("pausada", -100)).toBe("pausada");
  });

  it("formata minutos, horas e tempo passado com sinal de mais", () => {
    expect(formatarCronometro(1104)).toBe("18:24");
    expect(formatarCronometro(6130)).toBe("1:42:10");
    expect(formatarCronometro(-130)).toBe("+02:10");
    expect(formatarCronometro(0)).toBe("00:00");
  });
});
