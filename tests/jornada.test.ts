import { describe, expect, it } from "vitest";
import {
  DEFINICAO_PAPEIS,
  DURACAO_INTERVALO_MIN,
  FASES,
  MINIMO_PERGUNTAS,
  PAPEIS,
  TEMAS_ENTREVISTA,
  TIPOS_ATIVIDADE,
  avaliarFase,
} from "@/lib/jornada";

const todosOsTextos = FASES.flatMap((f) => [
  f.nome,
  f.nomeCurto,
  f.entrega,
  f.criterioTexto,
  f.aprofundamento,
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
    expect(avaliarFase(FASES[0], passos, { concluidos: new Set(["p0", "p1", "p2"]) }).ok).toBe(true);
  });
});
