// npm run db:migrar          aplica as migrações pendentes em DATABASE_URL
// npm run db:migrar -- --reset   apaga o esquema e reaplica (só banco local)
import { existsSync } from "node:fs";
import { aplicarMigracoes, zerarBanco } from "@/lib/servidor/migracoes";
import { encerrarSql, obterSql } from "@/lib/servidor/db";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

async function main() {
  const reset = process.argv.includes("--reset");
  const url = process.env.DATABASE_URL ?? "";
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const sql = obterSql();
  if (reset) {
    if (!local && !process.argv.includes("--forcar")) {
      throw new Error("--reset só roda em banco local. Use --forcar se tiver certeza.");
    }
    await zerarBanco(sql);
    console.log("Esquema apagado.");
  }
  const aplicadas = await aplicarMigracoes(sql);
  console.log(aplicadas.length ? `Migrações aplicadas: ${aplicadas.join(", ")}` : "Nada a migrar.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => encerrarSql());
