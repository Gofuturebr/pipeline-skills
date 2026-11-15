import type { NextRequest } from "next/server";
import { z } from "zod";
import { obterSql } from "@/lib/servidor/db";
import { eventoAtual } from "@/lib/servidor/consultas";
import {
  removerMesa,
  removerProcesso,
  salvarEvento,
  salvarFase,
  salvarMesa,
  salvarPasso,
  salvarProcesso,
} from "@/lib/servidor/preparo";
import { erro, exigirAdmin, lerCorpo, protegida, respostaDe } from "@/lib/servidor/http";

const Texto = (max: number) => z.string().max(max);
const Ficha = z.object({
  objetivo: Texto(2000).optional(),
  quemExecuta: Texto(2000).optional(),
  frequencia: Texto(2000).optional(),
  entradas: Texto(2000).optional(),
  resultadoEsperado: Texto(2000).optional(),
});

const ESQUEMAS = {
  evento: z.object({ nome: Texto(200), data: Texto(10), duracaoIntervaloMin: z.number().int(), palavrasVagas: z.array(Texto(60)).max(40) }),
  fase: z.object({ id: z.uuid(), duracaoMin: z.number().int(), aprofundamento: Texto(600) }),
  passo: z.object({ id: z.uuid(), instrucao: Texto(600) }),
  processo: z.object({
    id: z.uuid().nullable().optional(),
    nome: Texto(200),
    ficha: Ficha,
    kitMateriais: Texto(20000),
    exemploBom: Texto(20000),
    exemploRuim: Texto(20000),
    casoExemplo: Texto(20000),
    casoNovo: Texto(20000),
  }),
  "remover-processo": z.object({ id: z.uuid() }),
  mesa: z.object({ id: z.uuid().nullable().optional(), nome: Texto(80), processoId: z.uuid().nullable() }),
  "remover-mesa": z.object({ id: z.uuid() }),
} as const;

// Cadastros do evento. Só o gestor (o facilitador não altera cadastros).
export async function POST(req: NextRequest, ctx: RouteContext<"/api/admin/preparo/[acao]">) {
  const acesso = exigirAdmin(req, "preparo");
  if (!acesso.ok) return acesso.resposta;
  return protegida(async () => {
    const { acao } = await ctx.params;
    if (!(acao in ESQUEMAS)) return erro("Ação desconhecida.", 404);
    const sql = obterSql();
    const evento = await eventoAtual(sql);
    if (!evento) return erro("Nenhum evento cadastrado.", 404);
    const a = acesso.autor;
    switch (acao) {
      case "evento": {
        const c = await lerCorpo(req, ESQUEMAS["evento"]);
        return c.ok ? respostaDe(await salvarEvento(sql, evento.id, c.dados, a)) : c.resposta;
      }
      case "fase": {
        const c = await lerCorpo(req, ESQUEMAS["fase"]);
        return c.ok ? respostaDe(await salvarFase(sql, evento.id, c.dados.id, c.dados, a)) : c.resposta;
      }
      case "passo": {
        const c = await lerCorpo(req, ESQUEMAS["passo"]);
        return c.ok ? respostaDe(await salvarPasso(sql, evento.id, c.dados.id, c.dados.instrucao, a)) : c.resposta;
      }
      case "processo": {
        const c = await lerCorpo(req, ESQUEMAS["processo"]);
        return c.ok ? respostaDe(await salvarProcesso(sql, evento.id, c.dados, a)) : c.resposta;
      }
      case "remover-processo": {
        const c = await lerCorpo(req, ESQUEMAS["remover-processo"]);
        return c.ok ? respostaDe(await removerProcesso(sql, evento.id, c.dados.id, a)) : c.resposta;
      }
      case "mesa": {
        const c = await lerCorpo(req, ESQUEMAS["mesa"]);
        return c.ok ? respostaDe(await salvarMesa(sql, evento.id, c.dados, a)) : c.resposta;
      }
      default: {
        const c = await lerCorpo(req, ESQUEMAS["remover-mesa"]);
        return c.ok ? respostaDe(await removerMesa(sql, evento.id, c.dados.id, a)) : c.resposta;
      }
    }
  });
}
