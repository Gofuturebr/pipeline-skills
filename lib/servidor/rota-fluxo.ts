import type { Resultado } from "./acoes";
import { obterSql } from "./db";
import { respostaEmFluxo } from "./fluxo";
import { mesaPorCodigo } from "./consultas";
import { montarEstadoMesa } from "./estado-mesa";

/**
 * Rota da mesa que chama a IA com streaming: manda o texto aos poucos e, no
 * fim, o estado novo da mesa (ou o motivo da recusa, com o estado atual).
 */
export function fluxoDaMesa(
  codigo: string,
  executar: (aoTexto: (delta: string) => void) => Promise<Resultado<unknown>>,
): Response {
  return respostaEmFluxo(async (enviar) => {
    const r = await executar((d) => enviar({ t: "texto", d }));
    const sql = obterSql();
    const mesa = await mesaPorCodigo(sql, codigo);
    const dados = mesa ? await montarEstadoMesa(sql, mesa) : undefined;
    if (r.ok) enviar({ t: "fim", dados });
    else enviar({ t: "erro", mensagem: r.motivo, dados });
  });
}
