import { obterSql } from "./db";
import { mesaPorCodigo, type LinhaMesa } from "./consultas";
import { montarEstadoMesa } from "./estado-mesa";
import { erro, ok, protegida } from "./http";

export const MSG_MESA_NAO_ENCONTRADA = "Não encontramos esta mesa. Confira o código no cartão da mesa.";

/** Acha a mesa pelo código da URL. O código é a credencial da mesa. */
export async function comMesa(
  params: Promise<{ codigo: string }>,
  executar: (mesa: LinhaMesa) => Promise<Response>,
): Promise<Response> {
  return protegida(async () => {
    const { codigo } = await params;
    const mesa = await mesaPorCodigo(obterSql(), codigo);
    if (!mesa) return erro(MSG_MESA_NAO_ENCONTRADA, 404);
    return executar(mesa);
  });
}

/** Responde com o estado atualizado da mesa, para a tela não precisar pedir de novo. */
export async function responderEstado(codigo: string): Promise<Response> {
  return protegida(async () => {
    const sql = obterSql();
    const mesa = await mesaPorCodigo(sql, codigo);
    if (!mesa) return erro(MSG_MESA_NAO_ENCONTRADA, 404);
    return ok(await montarEstadoMesa(sql, mesa));
  });
}
