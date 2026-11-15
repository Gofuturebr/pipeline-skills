import type { Sql } from "./db";
import { roteiroDoEvento, type LinhaMesa } from "./consultas";
import { avisarMudanca, recusa, travarMesa, type Resultado } from "./acoes";
import { lerArquivo, salvarArquivo } from "./arquivos";
import { dividirSecoes, juntarSecoes, trocarSecao } from "@/lib/markdown";

// A mesa edita um arquivo da pasta, uma seção por vez. Só nos passos que
// permitem edição (por exemplo, revisar o SKILL.md na Fase 2).

export async function editarSecao(
  sql: Sql,
  mesaId: string,
  caminho: string,
  secao: string | null,
  corpo: string,
  versaoEsperada: number,
): Promise<Resultado> {
  let mesaAfetada: LinhaMesa | null = null;
  const r = await sql.begin(async (txBruta): Promise<Resultado> => {
    const tx = txBruta as unknown as Sql;
    const mesa = await travarMesa(tx, mesaId);
    if (!mesa) return recusa("Mesa não encontrada.", 404);
    if (mesa.estado === "pausada") return recusa("A mesa está pausada.");
    const roteiro = await roteiroDoEvento(tx, mesa.evento_id);
    const passos = roteiro.passosPorFase.get(mesa.fase_atual) ?? [];
    if (!passos.some((p) => p.permite_editar)) return recusa("Nesta fase a pasta não é editada à mão.", 403);
    const atual = await lerArquivo(tx, mesa.id, caminho);
    if (!atual) return recusa("Arquivo não encontrado.", 404);
    let novo: string;
    if (secao === null) {
      const titulo = corpo.replace(/\s+/g, " ").trim();
      if (!titulo) return recusa("O nome não pode ficar vazio.", 400);
      const a = dividirSecoes(atual.conteudo);
      a.titulo = titulo.slice(0, 80);
      novo = juntarSecoes(a);
    } else {
      novo = trocarSecao(atual.conteudo, secao, corpo.trim());
    }
    const salvo = await salvarArquivo(tx, mesa, caminho, novo, { autor: "mesa", versaoEsperada });
    if (!salvo.ok) return salvo;
    mesaAfetada = mesa;
    return { ok: true };
  });
  if (r.ok && mesaAfetada) await avisarMudanca(mesaAfetada);
  return r;
}
