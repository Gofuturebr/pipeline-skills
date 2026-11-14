import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { encerrarSql, prepararBanco, URL_TESTE } from "../ajuda/banco";
import { cumprirCriterios } from "../ajuda/criterios";
import type { Sql } from "@/lib/servidor/db";
import { acaoDeFase, concluirPasso, type Autor } from "@/lib/servidor/acoes";
import { confirmarTarefa, decidirContribuicao, definirPapel, marcarLeitura } from "@/lib/servidor/atividades";
import { mesaPorId, roteiroDoEvento } from "@/lib/servidor/consultas";
import { montarEstadoMesa } from "@/lib/servidor/estado-mesa";
import { montarPainel } from "@/lib/servidor/painel";
import {
  contribuir,
  cookieParticipante,
  entrarParticipante,
  montarEstadoCelular,
  participantePorToken,
} from "@/lib/servidor/participantes";
import { POST as entrarPelaRota } from "@/app/api/p/[codigo]/entrar/route";
import { GET as estadoDoCelular } from "@/app/api/p/[codigo]/estado/route";
import { POST as contribuirPelaRota } from "@/app/api/p/[codigo]/contribuir/route";
import { GET as qr } from "@/app/api/qr/[codigo]/route";
import type { EstadoCelularApi } from "@/lib/tipos-api";

const GESTOR: Autor = { perfil: "gestor", nome: "Gestora Teste" };

function requisicao(url: string, corpo?: unknown, cookie?: string) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: corpo === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
}

describe.skipIf(!URL_TESTE)("Marco 2: celular, papéis, leitura, tarefa e contribuições", () => {
  let sql: Sql;
  let eventoId: string;
  let mesaId: string;
  let codigo: string;

  beforeEach(async () => {
    const r = await prepararBanco();
    sql = r.sql;
    eventoId = r.eventoId;
    mesaId = r.mesas[0].id;
    codigo = r.mesas[0].codigo;
  });

  afterAll(async () => {
    await encerrarSql();
  });

  async function mesa() {
    return (await mesaPorId(sql, mesaId))!;
  }

  async function irParaFase(ordem: number) {
    while ((await mesa()).fase_atual < ordem) {
      expect((await acaoDeFase(sql, mesaId, "forcar", GESTOR)).ok).toBe(true);
    }
  }

  it("o celular entra só com o primeiro nome e aparece na mesa e no painel", async () => {
    const r = await entrarParticipante(sql, await mesa(), "  Ana   Maria ");
    expect(r.ok).toBe(true);
    const p = await participantePorToken(sql, mesaId, r.ok ? r.dados!.token : "");
    expect(p?.primeiro_nome).toBe("Ana Maria");

    const estado = await montarEstadoMesa(sql, await mesa());
    expect(estado.participantes.map((x) => x.nome)).toEqual(["Ana Maria"]);
    const painel = await montarPainel(sql, eventoId);
    expect(painel!.mesas.find((m) => m.id === mesaId)!.pessoas).toBe(1);

    // Token de outra mesa não serve.
    const outra = await sql<{ id: string }[]>`select id from mesa where id <> ${mesaId} limit 1`;
    expect(await participantePorToken(sql, outra[0].id, r.ok ? r.dados!.token : "")).toBeNull();
    expect((await entrarParticipante(sql, await mesa(), "   ")).ok).toBe(false);
  });

  it("o passo de distribuir só conclui com os 6 papéis, e o papel chega ao celular", async () => {
    const roteiro = await roteiroDoEvento(sql, eventoId);
    const distribuir = roteiro.passosPorFase.get(0)!.find((p) => p.chave === "distribuir")!;
    const recusa = await concluirPasso(sql, mesaId, distribuir.id);
    expect(recusa).toMatchObject({ ok: false, motivo: "Faltam 6 papéis sem nome" });

    const r = await entrarParticipante(sql, await mesa(), "Bruno");
    const bruno = await participantePorToken(sql, mesaId, r.ok ? r.dados!.token : "");
    expect((await definirPapel(sql, mesaId, "cetico", "Bruno", bruno!.id)).ok).toBe(true);
    // Nome digitado igual ao do celular também vale.
    expect((await definirPapel(sql, mesaId, "porta_voz", "bruno", null)).ok).toBe(true);
    const celular = await montarEstadoCelular(sql, await mesa(), bruno);
    expect(celular.participante!.papeis.map((p) => p.nome)).toEqual(["Cético", "Porta-voz"]);

    await cumprirCriterios(sql, mesaId);
    expect((await concluirPasso(sql, mesaId, distribuir.id)).ok).toBe(true);
  });

  it("atividade de fase não liberada é recusada", async () => {
    expect(await confirmarTarefa(sql, mesaId, "Responder pedido com preço e prazo")).toMatchObject({ ok: false, status: 403 });
    const roteiro = await roteiroDoEvento(sql, eventoId);
    const ficha = roteiro.passosPorFase.get(1)!.find((p) => p.chave === "ficha")!;
    expect(await marcarLeitura(sql, mesaId, ficha.id, true)).toMatchObject({ ok: false, status: 403 });

    await irParaFase(1);
    expect(await definirPapel(sql, mesaId, "piloto", "Ana", null)).toMatchObject({ ok: false, status: 403 });
    // A ficha e o kit chegam à mesa só a partir da Fase 1, sem o caso novo.
    const estado = await montarEstadoMesa(sql, await mesa());
    expect(estado.processoDetalhe?.ficha.objetivo).toBeTruthy();
    expect(JSON.stringify(estado)).not.toContain("Oficina Estrela");
  });

  it("Fase 1: Lemos e a tarefa em uma linha liberam a conclusão", async () => {
    await irParaFase(1);
    expect((await confirmarTarefa(sql, mesaId, "Orçamento")).ok).toBe(false);
    expect((await confirmarTarefa(sql, mesaId, "  Responder   pedido com preço e prazo ")).ok).toBe(true);
    expect((await mesa()).tarefa).toBe("Responder pedido com preço e prazo");

    let estado = await montarEstadoMesa(sql, await mesa());
    expect(estado.avaliacaoFase.ok).toBe(false);
    await cumprirCriterios(sql, mesaId);
    estado = await montarEstadoMesa(sql, await mesa());
    expect(estado.fases[1].passos.filter((p) => p.config.conteudo === "ficha")[0].lido).toBe(true);
    for (const p of estado.fases[1].passos) expect((await concluirPasso(sql, mesaId, p.id)).ok).toBe(true);
    estado = await montarEstadoMesa(sql, await mesa());
    expect(estado.avaliacaoFase.ok).toBe(true);
  });

  it("contribuição só nas fases que pedem, aparece na fila e a contagem chega ao celular", async () => {
    const r = await entrarParticipante(sql, await mesa(), "Carla");
    const carla = (await participantePorToken(sql, mesaId, r.ok ? r.dados!.token : ""))!;

    // Fase 0 não recebe envios.
    expect(await contribuir(sql, await mesa(), carla, "Uma dúvida")).toMatchObject({ ok: false, status: 409 });
    expect((await montarEstadoCelular(sql, await mesa(), carla)).contribuicao).toBeNull();

    await irParaFase(1);
    expect((await contribuir(sql, await mesa(), carla, "x".repeat(281))).ok).toBe(false);
    expect((await contribuir(sql, await mesa(), carla, "  E se o cliente pedir desconto?  ")).ok).toBe(true);
    let estado = await montarEstadoMesa(sql, await mesa());
    expect(estado.contribuicoes.pendentes).toMatchObject([{ texto: "E se o cliente pedir desconto?", autor: "Carla" }]);

    const id = estado.contribuicoes.pendentes[0].id;
    expect((await decidirContribuicao(sql, await mesa(), id, "aceita")).ok).toBe(true);
    const celular = await montarEstadoCelular(sql, await mesa(), carla);
    expect(celular.contribuicao).toMatchObject({ enviadas: 1, aceitas: 1 });

    // Pendente da Fase 1 continua na fila na Fase 2: nada se perde.
    expect((await contribuir(sql, await mesa(), carla, "Cliente que some depois do orçamento")).ok).toBe(true);
    await irParaFase(2);
    estado = await montarEstadoMesa(sql, await mesa());
    expect(estado.contribuicoes.pendentes.map((c) => c.texto)).toEqual(["Cliente que some depois do orçamento"]);
    expect(estado.contribuicoes.aceitas).toHaveLength(1);
  });

  it("rotas do celular: entrar grava o cookie, o estado reconhece a pessoa e envio sem nome é recusado", async () => {
    await irParaFase(1);
    const params = Promise.resolve({ codigo });
    const semNome = await contribuirPelaRota(requisicao(`/api/p/${codigo}/contribuir`, { texto: "oi" }), { params });
    expect(semNome.status).toBe(401);

    const entrada = await entrarPelaRota(requisicao(`/api/p/${codigo}/entrar`, { nome: "Davi" }), {
      params: Promise.resolve({ codigo }),
    });
    expect(entrada.status).toBe(200);
    const cookie = entrada.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${cookieParticipante(codigo)}=`);
    expect(cookie.toLowerCase()).toContain("httponly");
    const par = cookie.split(";")[0];

    const estado = (await (
      await estadoDoCelular(requisicao(`/api/p/${codigo}/estado`, undefined, par), { params: Promise.resolve({ codigo }) })
    ).json()) as EstadoCelularApi;
    expect(estado.participante?.nome).toBe("Davi");
    expect(estado.contribuicao?.rotulo).toBeTruthy();
    expect(estado.ficha?.objetivo).toBeTruthy();

    const envio = await contribuirPelaRota(requisicao(`/api/p/${codigo}/contribuir`, { texto: "Uma dúvida" }, par), {
      params: Promise.resolve({ codigo }),
    });
    expect(envio.status).toBe(200);
    expect(((await envio.json()) as EstadoCelularApi).contribuicao?.enviadas).toBe(1);
  });

  it("o QR aponta para a tela do participante", async () => {
    process.env.URL_PUBLICA = "https://oficina.exemplo.com.br/";
    try {
      const r = await qr(requisicao(`/api/qr/${codigo}`), { params: Promise.resolve({ codigo }) });
      expect(r.headers.get("content-type")).toBe("image/svg+xml");
      expect(await r.text()).toContain("<svg");
      const { enderecoDoParticipante } = await import("@/lib/servidor/endereco");
      expect(enderecoDoParticipante(new Headers({ host: "localhost:3000" }), codigo)).toBe(
        `https://oficina.exemplo.com.br/p/${codigo}`,
      );
    } finally {
      delete process.env.URL_PUBLICA;
    }
  });
});
