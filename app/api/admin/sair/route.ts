import { COOKIE_ADMIN } from "@/lib/servidor/sessao-admin";
import { ok } from "@/lib/servidor/http";

export async function POST() {
  const resposta = ok({ ok: true });
  resposta.headers.append("Set-Cookie", `${COOKIE_ADMIN}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return resposta;
}
