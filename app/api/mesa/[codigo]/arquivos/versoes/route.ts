import type { NextRequest } from "next/server";
import { obterSql } from "@/lib/servidor/db";
import { versoesDoArquivo } from "@/lib/servidor/arquivos";
import { ok } from "@/lib/servidor/http";
import { comMesa } from "@/lib/servidor/rota-mesa";

// Histórico de um arquivo da pasta da própria mesa (RN06).
export async function GET(req: NextRequest, ctx: RouteContext<"/api/mesa/[codigo]/arquivos/versoes">) {
  return comMesa(ctx.params, async (mesa) => {
    const caminho = req.nextUrl.searchParams.get("caminho") ?? "";
    return ok({ versoes: await versoesDoArquivo(obterSql(), mesa.id, caminho) });
  });
}
