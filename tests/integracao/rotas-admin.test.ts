import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { encerrarSql, prepararBanco, URL_TESTE } from "../ajuda/banco";
import { COOKIE_ADMIN, criarSessao } from "@/lib/servidor/sessao-admin";
import { POST as acaoMesa } from "@/app/api/admin/mesas/[id]/[acao]/route";
import { POST as acaoTodas } from "@/app/api/admin/todas/[acao]/route";
import { GET as painel } from "@/app/api/admin/painel/route";
import { POST as concluirFaseDaMesa } from "@/app/api/mesa/[codigo]/fase/concluir/route";
import { GET as estadoDaMesa } from "@/app/api/mesa/[codigo]/estado/route";

function requisicao(url: string, cookie?: string, corpo?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method: corpo === undefined ? "GET" : "POST",
    headers: { ...(cookie ? { cookie: `${COOKIE_ADMIN}=${cookie}` } : {}), "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
}

describe.skipIf(!URL_TESTE)("rotas do admin e da mesa", () => {
  let mesaId: string;
  let codigo: string;

  beforeAll(async () => {
    process.env.SESSION_SECRET = "segredo-de-teste-com-mais-de-16";
    const r = await prepararBanco();
    mesaId = r.mesas[0].id;
    codigo = r.mesas[0].codigo;
  });

  afterAll(async () => {
    await encerrarSql();
  });

  it("sem sessão, o painel e as ações recusam com 401", async () => {
    expect((await painel(requisicao("/api/admin/painel"))).status).toBe(401);
    const r = await acaoMesa(requisicao(`/api/admin/mesas/${mesaId}/forcar`, undefined, {}), {
      params: Promise.resolve({ id: mesaId, acao: "forcar" }),
    });
    expect(r.status).toBe(401);
  });

  it("facilitador força a fase de uma mesa, mas não pausa nem avança todas", async () => {
    const cookie = criarSessao("facilitador", "Facilitador");
    const pausar = await acaoMesa(requisicao(`/api/admin/mesas/${mesaId}/pausar`, cookie, {}), {
      params: Promise.resolve({ id: mesaId, acao: "pausar" }),
    });
    expect(pausar.status).toBe(403);
    const todas = await acaoTodas(requisicao(`/api/admin/todas/avancar-todas`, cookie, {}), {
      params: Promise.resolve({ acao: "avancar-todas" }),
    });
    expect(todas.status).toBe(403);
    const forcar = await acaoMesa(requisicao(`/api/admin/mesas/${mesaId}/forcar`, cookie, {}), {
      params: Promise.resolve({ id: mesaId, acao: "forcar" }),
    });
    expect(forcar.status).toBe(200);
  });

  it("a mesa não tem como avançar de fase sozinha pela API", async () => {
    // A única rota de fase da mesa é "concluir", que não muda a fase.
    const r = await concluirFaseDaMesa(requisicao(`/api/mesa/${codigo}/fase/concluir`, undefined, {}), {
      params: Promise.resolve({ codigo }),
    });
    expect(r.status).toBe(409);
    const estado = await (await estadoDaMesa(requisicao(`/api/mesa/${codigo}/estado`), { params: Promise.resolve({ codigo }) })).json();
    expect(estado.mesa.faseAtual).toBe(1);
  });

  it("código de mesa inválido devolve a mensagem da interface", async () => {
    const r = await estadoDaMesa(requisicao(`/api/mesa/XXXXXX/estado`), { params: Promise.resolve({ codigo: "XXXXXX" }) });
    expect(r.status).toBe(404);
    expect((await r.json()).erro).toBe("Não encontramos esta mesa. Confira o código no cartão da mesa.");
  });
});
