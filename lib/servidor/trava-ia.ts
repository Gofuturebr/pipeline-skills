import type { Sql } from "./db";

// Uma chamada à IA por mesa por vez (dois cliques, duas abas). A trava fica na
// linha da entrevista da mesa e expira sozinha, para nunca prender a mesa.

export async function travarIA(sql: Sql, mesaId: string, segundos: number): Promise<boolean> {
  await sql`insert into entrevista (mesa_id) values (${mesaId}) on conflict do nothing`;
  const r = await sql`
    update entrevista set ocupada_ate = now() + make_interval(secs => ${segundos})
    where mesa_id = ${mesaId} and (ocupada_ate is null or ocupada_ate < now())
    returning mesa_id`;
  return r.length > 0;
}

export async function destravarIA(sql: Sql, mesaId: string): Promise<void> {
  await sql`update entrevista set ocupada_ate = null where mesa_id = ${mesaId}`;
}
