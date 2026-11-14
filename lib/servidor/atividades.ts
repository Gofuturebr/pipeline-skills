import type { Sql } from "./db";
import { roteiroDoEvento, type LinhaMesa, type LinhaPasso } from "./consultas";
import { avisarMudanca, recusa, registrar, travarMesa, type Resultado } from "./acoes";
import { PAPEIS, limparTarefa, problemaDaTarefa, type Papel, type TipoAtividade } from "@/lib/jornada";
import { limparNome } from "@/lib/participante";
import { emitir } from "./sinais";
import { canalMesa } from "@/lib/sinais";

// Ações das atividades das Fases 0 e 1: papéis, leitura, tarefa em uma linha e
// a fila de contribuições. Cada ação só vale quando a fase atual da mesa tem um
// passo daquele tipo: a mesa não mexe em atividade de fase não liberada.

const AUTOR_MESA = { perfil: "mesa" as const, nome: "" };

async function passosDaFaseAtual(tx: Sql, mesa: LinhaMesa): Promise<LinhaPasso[]> {
  const roteiro = await roteiroDoEvento(tx, mesa.evento_id);
  return roteiro.passosPorFase.get(mesa.fase_atual) ?? [];
}

/** Abre uma transação com a mesa travada e confere se ela pode mexer na atividade. */
async function naAtividade(
  sql: Sql,
  mesaId: string,
  tipo: TipoAtividade,
  executar: (tx: Sql, mesa: LinhaMesa, passos: LinhaPasso[]) => Promise<Resultado>,
): Promise<Resultado> {
  let mesaAfetada: LinhaMesa | null = null;
  const r = await sql.begin(async (txBruta): Promise<Resultado> => {
    const tx = txBruta as unknown as Sql;
    const mesa = await travarMesa(tx, mesaId);
    if (!mesa) return recusa("Mesa não encontrada.", 404);
    if (mesa.estado === "pausada") return recusa("A mesa está pausada.");
    if (mesa.final) return recusa("A skill já foi marcada como final.");
    const passos = await passosDaFaseAtual(tx, mesa);
    const daAtividade = passos.filter((p) => p.tipo_atividade === tipo);
    if (daAtividade.length === 0) return recusa("Esta atividade não é da fase liberada para a mesa.", 403);
    const resultado = await executar(tx, mesa, daAtividade);
    if (resultado.ok) {
      await tx`update mesa set versao = versao + 1 where id = ${mesa.id}`;
      mesaAfetada = mesa;
    }
    return resultado;
  });
  if (r.ok && mesaAfetada) await avisarMudanca(mesaAfetada);
  return r;
}

/** Fase 0: dá um nome a um papel. Nome vazio tira a pessoa do papel. */
export async function definirPapel(
  sql: Sql,
  mesaId: string,
  papel: Papel,
  nome: string,
  participanteId: string | null,
): Promise<Resultado> {
  if (!PAPEIS.includes(papel)) return recusa("Papel desconhecido.", 400);
  return naAtividade(sql, mesaId, "papeis", async (tx, mesa) => {
    const limpo = limparNome(nome);
    if (!limpo) {
      await tx`delete from papel_mesa where mesa_id = ${mesa.id} and papel = ${papel}`;
      return { ok: true };
    }
    let idValido: string | null = null;
    if (participanteId) {
      const [p] = await tx<{ id: string }[]>`
        select id from participante where id = ${participanteId} and mesa_id = ${mesa.id}`;
      idValido = p?.id ?? null;
    }
    await tx`
      insert into papel_mesa (mesa_id, papel, nome, participante_id)
      values (${mesa.id}, ${papel}, ${limpo}, ${idValido})
      on conflict (mesa_id, papel) do update set nome = excluded.nome, participante_id = excluded.participante_id`;
    return { ok: true };
  });
}

/** Fase 1: marca (ou desmarca) "Lemos" num passo de leitura. */
export async function marcarLeitura(sql: Sql, mesaId: string, passoId: string, lido: boolean): Promise<Resultado> {
  return naAtividade(sql, mesaId, "leitura", async (tx, mesa, passos) => {
    if (!passos.some((p) => p.id === passoId)) return recusa("Este passo não é da fase liberada para a mesa.", 403);
    if (lido) {
      await tx`insert into leitura (mesa_id, passo_id) values (${mesa.id}, ${passoId}) on conflict do nothing`;
    } else {
      await tx`delete from leitura where mesa_id = ${mesa.id} and passo_id = ${passoId}`;
    }
    return { ok: true };
  });
}

/** Fase 1: confirma a tarefa em uma linha. Ela aparece na barra superior da mesa. */
export async function confirmarTarefa(sql: Sql, mesaId: string, texto: string): Promise<Resultado> {
  return naAtividade(sql, mesaId, "frase", async (tx, mesa, passos) => {
    if (!passos.some((p) => p.config?.campo === "tarefa")) {
      return recusa("Esta fase não pede a tarefa em uma linha.", 403);
    }
    const problema = problemaDaTarefa(texto);
    if (problema) return recusa(problema, 400);
    const limpa = limparTarefa(texto);
    await tx`update mesa set tarefa = ${limpa} where id = ${mesa.id}`;
    await registrar(tx, mesa.evento_id, mesa.id, "confirmar_tarefa", AUTOR_MESA, { tarefa: limpa });
    return { ok: true };
  });
}

/** O Piloto aceita ou descarta uma contribuição. Também desfaz a decisão. */
export async function decidirContribuicao(
  sql: Sql,
  mesa: LinhaMesa,
  contribuicaoId: string,
  estado: "aceita" | "descartada" | "pendente",
): Promise<Resultado> {
  const [c] = await sql<{ id: string }[]>`
    update contribuicao set estado = ${estado}
    where id = ${contribuicaoId} and mesa_id = ${mesa.id}
    returning id`;
  if (!c) return recusa("Este envio não é desta mesa.", 404);
  // A mesa e os celulares dela atualizam a contagem de aceitas.
  await emitir([canalMesa(mesa.id)], { tipo: "contribuicao", mesaId: mesa.id });
  return { ok: true };
}
