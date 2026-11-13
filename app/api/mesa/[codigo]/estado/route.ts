import type { NextRequest } from "next/server";
import { responderEstado } from "@/lib/servidor/rota-mesa";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/estado">) {
  const { codigo } = await ctx.params;
  return responderEstado(codigo);
}
