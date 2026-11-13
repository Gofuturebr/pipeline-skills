import type { NextRequest } from "next/server";
import { z } from "zod";
import { COOKIE_ADMIN, criarSessao, DURACAO_SESSAO_S, perfilPelaSenha } from "@/lib/servidor/sessao-admin";
import { erro, lerCorpo, ok } from "@/lib/servidor/http";

const Corpo = z.object({
  senha: z.string().min(1).max(200),
  nome: z.string().trim().min(1).max(40),
});

export async function POST(req: NextRequest) {
  const corpo = await lerCorpo(req, Corpo);
  if (!corpo.ok) return erro("Informe seu nome e a senha.");
  const perfil = perfilPelaSenha(corpo.dados.senha);
  if (!perfil) return erro("Senha incorreta.", 401);
  const resposta = ok({ perfil, nome: corpo.dados.nome });
  resposta.headers.append(
    "Set-Cookie",
    `${COOKIE_ADMIN}=${criarSessao(perfil, corpo.dados.nome)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DURACAO_SESSAO_S}${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  );
  return resposta;
}
