import postgres from "postgres";

// Conexão direta ao Postgres (local ou Supabase). Só o servidor usa.
// prepare: false mantém compatibilidade com o pooler do Supabase em modo transação.

export type Sql = postgres.Sql;

const global = globalThis as unknown as { __mesaSql?: Sql };

export function obterSql(): Sql {
  if (!global.__mesaSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não configurada. Veja .env.example.");
    global.__mesaSql = postgres(url, {
      prepare: false,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idle_timeout: 20,
      onnotice: () => {},
    });
  }
  return global.__mesaSql;
}

/** Usado pelos testes para trocar de banco entre execuções. */
export async function encerrarSql(): Promise<void> {
  if (global.__mesaSql) {
    await global.__mesaSql.end({ timeout: 5 });
    global.__mesaSql = undefined;
  }
}
