import type { Sql } from "./db";
import { iso, mesaPorId, mesasDoEvento, roteiroDoEvento, type LinhaMesa } from "./consultas";
import { avisarMudanca, recusa, registrar, type Autor, type Resultado } from "./acoes";
import { arquivosDaMesa } from "./arquivos";
import { executarPlacar, rodadasPorIds } from "./rodadas";
import { emitir } from "./sinais";
import { acharSensivel, mensagemSensivel } from "@/lib/sensivel";
import { canalAdmin, canalEvento, canalMesa } from "@/lib/sinais";
import type { TesteApi } from "@/lib/tipos-api";

// Teste cruzado (Fase 5). Uma mesa roda a skill da parceira com o caso novo do
// kit, vendo só a pasta, em leitura, sem a conversa (RN09). Só começa quando as
// duas mesas concluíram a Fase 4 (RN10). O gestor pode trocar o par (RN11).

export const FASE_TESTE = 5;

interface LinhaTeste {
  id: string;
  mesa_autora_id: string;
  mesa_testadora_id: string;
  estado: "aguardando" | "em_teste" | "enviado";
  rodada_id: string | null;
  enviado_em: Date | null;
}

/** Pares em ordem de número: 1 e 2, 3 e 4. Com número ímpar, as três últimas formam um ciclo. */
export function calcularPares(ids: string[]): { autora: string; testadora: string }[] {
  const pares: { autora: string; testadora: string }[] = [];
  const n = ids.length;
  if (n < 2) return pares;
  const limite = n % 2 === 0 ? n : n - 3;
  for (let i = 0; i < limite; i += 2) {
    pares.push({ autora: ids[i], testadora: ids[i + 1] });
    pares.push({ autora: ids[i + 1], testadora: ids[i] });
  }
  if (n % 2 === 1) {
    const [a, b, c] = ids.slice(n - 3);
    // A testa B, B testa C, C testa A.
    pares.push({ testadora: a, autora: b }, { testadora: b, autora: c }, { testadora: c, autora: a });
  }
  return pares;
}

export async function formarPares(sql: Sql, eventoId: string, autor: Autor): Promise<Resultado<{ pares: number }>> {
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from teste_cruzado where evento_id = ${eventoId}`;
  if (n > 0) return recusa("Os pares já foram formados. Para mudar um par, abram o detalhe da mesa.");
  const mesas = await mesasDoEvento(sql, eventoId);
  const pares = calcularPares(mesas.map((m) => m.id));
  if (pares.length === 0) return recusa("São precisas pelo menos duas mesas para o teste cruzado.");
  await sql.begin(async (tx) => {
    for (const p of pares) {
      await tx`
        insert into teste_cruzado (evento_id, mesa_autora_id, mesa_testadora_id)
        values (${eventoId}, ${p.autora}, ${p.testadora})`;
    }
  });
  await registrar(sql, eventoId, null, "formar_pares", autor, { pares: pares.length });
  await emitir([canalEvento(eventoId), canalAdmin(eventoId)], { tipo: "evento" });
  return { ok: true, dados: { pares: pares.length } };
}

/** RN11: o gestor redefine qual mesa esta mesa testa. O teste dela recomeça. */
export async function trocarParceira(sql: Sql, testadoraId: string, autoraId: string, autor: Autor): Promise<Resultado> {
  if (testadoraId === autoraId) return recusa("Uma mesa não testa a própria skill.", 400);
  const [testadora, autora] = await Promise.all([mesaPorId(sql, testadoraId), mesaPorId(sql, autoraId)]);
  if (!testadora || !autora || testadora.evento_id !== autora.evento_id) return recusa("Mesa não encontrada.", 404);
  await sql`
    insert into teste_cruzado (evento_id, mesa_autora_id, mesa_testadora_id)
    values (${testadora.evento_id}, ${autora.id}, ${testadora.id})
    on conflict (mesa_testadora_id) do update
      set mesa_autora_id = excluded.mesa_autora_id, estado = 'aguardando', rodada_id = null, enviado_em = null`;
  await registrar(sql, testadora.evento_id, testadora.id, "trocar_parceira", autor, { testa: autora.nome });
  await emitir([canalMesa(testadora.id), canalMesa(autora.id), canalAdmin(testadora.evento_id)], { tipo: "mesa" });
  return { ok: true };
}

async function testeDaTestadora(sql: Sql, mesaId: string): Promise<LinhaTeste | null> {
  const [t] = await sql<LinhaTeste[]>`
    select id, mesa_autora_id, mesa_testadora_id, estado, rodada_id, enviado_em
    from teste_cruzado where mesa_testadora_id = ${mesaId}`;
  return t ?? null;
}

async function testeDaAutora(sql: Sql, mesaId: string): Promise<LinhaTeste | null> {
  const [t] = await sql<LinhaTeste[]>`
    select id, mesa_autora_id, mesa_testadora_id, estado, rodada_id, enviado_em
    from teste_cruzado where mesa_autora_id = ${mesaId} order by enviado_em desc nulls last limit 1`;
  return t ?? null;
}

function liberado(testadora: LinhaMesa, autora: LinhaMesa): boolean {
  return testadora.fase_atual >= FASE_TESTE && autora.fase_atual >= FASE_TESTE;
}

/** O que a mesa vê do teste: a quem testa, a pasta da parceira e o relatório recebido. */
export async function montarTeste(sql: Sql, mesa: LinhaMesa): Promise<TesteApi> {
  const [meu, recebido] = await Promise.all([testeDaTestadora(sql, mesa.id), testeDaAutora(sql, mesa.id)]);
  const autora = meu ? await mesaPorId(sql, meu.mesa_autora_id) : null;
  const testadora = recebido ? await mesaPorId(sql, recebido.mesa_testadora_id) : null;
  const ok = Boolean(autora && liberado(mesa, autora));
  const ids = [meu?.rodada_id, recebido?.estado === "enviado" ? recebido.rodada_id : null].filter(Boolean) as string[];
  const rodadas = await rodadasPorIds(sql, ids);
  let motivoEspera: string | null = null;
  if (!meu || !autora) motivoEspera = "O gestor ainda vai formar os pares do teste cruzado.";
  else if (autora.fase_atual < FASE_TESTE) motivoEspera = `A ${autora.nome} ainda está terminando a Prova. Esperem um pouco.`;
  return {
    parceira: autora ? { id: autora.id, nome: autora.nome } : null,
    liberado: ok,
    motivoEspera,
    rodada: rodadas.find((r) => r.id === meu?.rodada_id) ?? null,
    enviado: meu?.estado === "enviado",
    pastaParceira: ok && autora ? await arquivosDaMesa(sql, autora.id) : [],
    testadaPor: testadora ? { id: testadora.id, nome: testadora.nome } : null,
    recebido:
      recebido?.estado === "enviado" && testadora
        ? {
            testadora: testadora.nome,
            rodada: rodadas.find((r) => r.id === recebido.rodada_id) ?? null,
            enviadoEm: iso(recebido.enviado_em) as string,
          }
        : null,
  };
}

async function conferirPasso(sql: Sql, mesa: LinhaMesa, modo: string): Promise<Resultado | null> {
  if (mesa.estado === "pausada") return recusa("A mesa está pausada.");
  const roteiro = await roteiroDoEvento(sql, mesa.evento_id);
  const passos = roteiro.passosPorFase.get(mesa.fase_atual) ?? [];
  if (!passos.some((p) => p.config?.modo === modo)) return recusa("Esta atividade não é da fase liberada para a mesa.", 403);
  return null;
}

/** O Testador roda a skill da parceira com o caso novo do kit dela, sem consertar. */
export async function testar(sql: Sql, mesaId: string, aoTexto: (d: string) => void): Promise<Resultado> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) return recusa("Mesa não encontrada.", 404);
  const problema = await conferirPasso(sql, mesa, "teste");
  if (problema) return problema;
  const meu = await testeDaTestadora(sql, mesa.id);
  const autora = meu ? await mesaPorId(sql, meu.mesa_autora_id) : null;
  if (!meu || !autora) return recusa("O gestor ainda vai formar os pares do teste cruzado.");
  if (!liberado(mesa, autora)) return recusa(`A ${autora.nome} ainda está terminando a Prova. Esperem um pouco.`);
  if (meu.estado === "enviado") return recusa("O relatório já foi enviado.");
  const [{ temSkill, conferencias }] = await sql<{ temSkill: boolean; conferencias: number }[]>`
    select exists (select 1 from arquivo where mesa_id = ${autora.id} and caminho = 'SKILL.md') as "temSkill",
      (select count(*)::int from conferencia where mesa_id = ${autora.id} and valida) as conferencias`;
  if (!temSkill) {
    return recusa(`A ${autora.nome} ainda não tem SKILL.md na pasta. Não há skill para testar: avisem o gestor.`);
  }
  if (conferencias === 0) {
    return recusa(`A ${autora.nome} ainda não tem conferências na Prova. Não há o que conferir: avisem o gestor.`);
  }
  const r = await executarPlacar(
    sql,
    { mesaQueRoda: mesa, mesaDaPasta: autora, tipo: "teste", caso: "caso_novo", consertar: false },
    aoTexto,
  );
  if (!r.ok) return r;
  await sql`update teste_cruzado set rodada_id = ${r.dados!.rodadaId}, estado = 'em_teste' where id = ${meu.id}`;
  await avisarMudanca(mesa);
  return { ok: true };
}

/** O Testador escreve o que aconteceu numa falha. */
export async function observar(sql: Sql, mesaId: string, resultadoId: string, texto: string): Promise<Resultado> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) return recusa("Mesa não encontrada.", 404);
  const problema = await conferirPasso(sql, mesa, "observar");
  if (problema) return problema;
  const meu = await testeDaTestadora(sql, mesa.id);
  if (!meu?.rodada_id) return recusa("Rodem o teste antes.");
  if (meu.estado === "enviado") return recusa("O relatório já foi enviado.");
  const observacao = texto.replace(/[ \t]+/g, " ").trim().slice(0, 600);
  const achado = acharSensivel(observacao);
  if (achado) return recusa(mensagemSensivel(achado), 400);
  const r = await sql`
    update resultado_conferencia set observacao = ${observacao}
    where id = ${resultadoId} and rodada_id = ${meu.rodada_id} returning id`;
  if (r.length === 0) return recusa("Item do placar não encontrado.", 404);
  await avisarMudanca(mesa);
  return { ok: true };
}

/** Envia o relatório à mesa autora. Cada falha precisa da observação do Testador. */
export async function enviarRelatorio(sql: Sql, mesaId: string): Promise<Resultado> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) return recusa("Mesa não encontrada.", 404);
  const problema = await conferirPasso(sql, mesa, "enviar");
  if (problema) return problema;
  const meu = await testeDaTestadora(sql, mesa.id);
  if (!meu?.rodada_id) return recusa("Rodem o teste antes de enviar.");
  if (meu.estado === "enviado") return { ok: true };
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from resultado_conferencia
    where rodada_id = ${meu.rodada_id} and not passou and observacao = ''`;
  if (n > 0) return recusa("Escrevam o que aconteceu em cada falha antes de enviar.");
  await sql`update teste_cruzado set estado = 'enviado', enviado_em = now() where id = ${meu.id}`;
  await registrar(sql, mesa.evento_id, mesa.id, "enviar_relatorio", { perfil: "mesa", nome: "" }, {
    autora: meu.mesa_autora_id,
  });
  await emitir([canalMesa(meu.mesa_autora_id), canalMesa(mesa.id), canalAdmin(mesa.evento_id)], {
    tipo: "mesa",
    mesaId: meu.mesa_autora_id,
  });
  return { ok: true };
}

/** Dados do teste para os critérios das Fases 5 e 6. */
export async function dadosDoTesteParaCriterios(sql: Sql, mesaId: string) {
  const [meu, recebido] = await Promise.all([testeDaTestadora(sql, mesaId), testeDaAutora(sql, mesaId)]);
  let falhasSemObservacao = 0;
  if (meu?.rodada_id) {
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from resultado_conferencia
      where rodada_id = ${meu.rodada_id} and not passou and observacao = ''`;
    falhasSemObservacao = n;
  }
  return {
    testeRodado: Boolean(meu?.rodada_id),
    falhasSemObservacao,
    relatorioEnviado: meu?.estado === "enviado",
    relatorioRecebido: recebido?.estado === "enviado",
  };
}
