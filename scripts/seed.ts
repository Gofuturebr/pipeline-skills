// npm run db:seed   cria o evento de demonstração (1 evento, 1 processo, 3 mesas)
import { existsSync } from "node:fs";
import { encerrarSql, obterSql } from "@/lib/servidor/db";
import { semearDemo } from "@/lib/servidor/semear";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

async function main() {
  const sql = obterSql();
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from evento`;
  if (n > 0) {
    console.log("Já existe evento no banco. Use npm run db:reset para recomeçar do zero.");
    return;
  }
  const r = await semearDemo(sql);
  console.log("Evento de demonstração criado.");
  for (const m of r.mesas) console.log(`  Mesa ${String(m.numero).padStart(2, "0")}: código ${m.codigo}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => encerrarSql());
