import { cookies } from "next/headers";
import { COOKIE_ADMIN, lerSessao, type SessaoAdmin } from "./sessao-admin";

/** Sessão do admin numa página (Server Component). */
export async function sessaoDaPagina(): Promise<SessaoAdmin | null> {
  const loja = await cookies();
  return lerSessao(loja.get(COOKIE_ADMIN)?.value);
}
