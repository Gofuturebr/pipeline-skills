import type { NextRequest } from "next/server";
import { obterSql } from "@/lib/servidor/db";
import { erro } from "@/lib/servidor/http";
import { comMesa } from "@/lib/servidor/rota-mesa";
import { respostaZip, zipDaSkill } from "@/lib/exportacao/pasta";

// Download da skill na tela da mesa, depois de marcada como final.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/baixar">) {
  return comMesa(ctx.params, async (mesa) => {
    if (!mesa.final) return erro("A skill ainda não foi marcada como final.", 409);
    const z = await zipDaSkill(obterSql(), mesa.id);
    if (!z) return erro("A pasta ainda não tem o SKILL.md.", 404);
    return respostaZip(z.nome, z.zip);
  });
}
