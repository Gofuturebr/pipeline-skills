import type { Resultado } from "./acoes";
import { obterSql } from "./db";
import { respostaEmFluxo } from "./fluxo";
import { mesaPorCodigo } from "./consultas";
import { montarEstadoMesa } from "./estado-mesa";
import { emitir } from "./sinais";
import { canalMesa } from "@/lib/sinais";

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
    // Os celulares da mesa buscam o estado de novo: pergunta nova, SKILL.md escrito.
    if (r.ok && mesa) await emitir([canalMesa(mesa.id)], { tipo: "mesa", mesaId: mesa.id });
    if (r.ok) enviar({ t: "fim", dados });
    else enviar({ t: "erro", mensagem: r.motivo, dados });
  });
}
