import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { trocarParceira } from "@/lib/servidor/teste";
import { exigirAdmin, lerCorpo, protegida, respostaDe } from "@/lib/servidor/http";

const Corpo = z.object({ autoraId: z.uuid() });

// RN11: o gestor redefine a mesa que esta mesa testa.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/admin/mesas/[id]/parceira">) {
  const acesso = exigirAdmin(req, "teste_cruzado");
  if (!acesso.ok) return acesso.resposta;
  return protegida(async () => {
    const { id } = await ctx.params;
    const corpo = await lerCorpo(req, Corpo);
    if (!corpo.ok) return corpo.resposta;
    return respostaDe(await trocarParceira(obterSql(), id, corpo.dados.autoraId, acesso.autor));
  });
}
