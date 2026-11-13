import { existsSync } from "node:fs";
import { encerrarSql, obterSql, type Sql } from "@/lib/servidor/db";
import { aplicarMigracoes, zerarBanco } from "@/lib/servidor/migracoes";
import { semearDemo, type ResultadoSemente } from "@/lib/servidor/semear";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

/** Banco só para testes. Ele é apagado e recriado a cada preparação. */
export const URL_TESTE = process.env.DATABASE_URL_TESTE;

export async function prepararBanco(): Promise<ResultadoSemente & { sql: Sql }> {
  if (!URL_TESTE) throw new Error("DATABASE_URL_TESTE não configurada");
  // Garante que os testes nunca usam o banco de desenvolvimento.
  process.env.DATABASE_URL = URL_TESTE;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  await encerrarSql();
  const sql = obterSql();
  await zerarBanco(sql);
  await aplicarMigracoes(sql);
  const semente = await semearDemo(sql);
  return { sql, ...semente };
}

export { encerrarSql };
