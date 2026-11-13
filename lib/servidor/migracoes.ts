import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Sql } from "./db";

const PASTA = path.join(process.cwd(), "supabase", "migrations");

/** Aplica, em ordem, as migrações de supabase/migrations que ainda não rodaram. */
export async function aplicarMigracoes(sql: Sql): Promise<string[]> {
  await sql`create table if not exists _migracao (nome text primary key, aplicada_em timestamptz not null default now())`;
  const feitas = new Set((await sql<{ nome: string }[]>`select nome from _migracao`).map((r) => r.nome));
  const arquivos = (await readdir(PASTA)).filter((a) => a.endsWith(".sql")).sort();
  const aplicadas: string[] = [];
  for (const nome of arquivos) {
    if (feitas.has(nome)) continue;
    const conteudo = await readFile(path.join(PASTA, nome), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(conteudo);
      await tx`insert into _migracao (nome) values (${nome})`;
    });
    aplicadas.push(nome);
  }
  return aplicadas;
}

/** Apaga tudo do esquema public. Só para banco local e de teste. */
export async function zerarBanco(sql: Sql): Promise<void> {
  await sql.unsafe("drop schema if exists public cascade; create schema public;");
}
