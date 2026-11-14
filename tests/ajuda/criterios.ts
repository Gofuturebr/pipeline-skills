import { expect } from "vitest";
import type { Sql } from "@/lib/servidor/db";
import { confirmarTarefa, definirPapel, marcarLeitura } from "@/lib/servidor/atividades";
import { mesaPorId, roteiroDoEvento } from "@/lib/servidor/consultas";
import { PAPEIS } from "@/lib/jornada";

const NOMES = ["Ana", "Bruno", "Carla", "Davi", "Elisa", "Fábio"];

/** Faz o que as atividades da fase atual pedem, como a mesa faria na tela. */
export async function cumprirCriterios(sql: Sql, mesaId: string): Promise<void> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) throw new Error("mesa não encontrada");
  const roteiro = await roteiroDoEvento(sql, mesa.evento_id);
  const passos = roteiro.passosPorFase.get(mesa.fase_atual) ?? [];
  if (passos.some((p) => p.tipo_atividade === "papeis")) {
    for (const [i, papel] of PAPEIS.entries()) {
      expect((await definirPapel(sql, mesaId, papel, NOMES[i], null)).ok).toBe(true);
    }
  }
  for (const p of passos.filter((x) => x.criterio === "lido")) {
    expect((await marcarLeitura(sql, mesaId, p.id, true)).ok).toBe(true);
  }
  if (passos.some((p) => p.config?.campo === "tarefa")) {
    expect((await confirmarTarefa(sql, mesaId, "Responder pedido de orçamento com preço e prazo")).ok).toBe(true);
  }
}
