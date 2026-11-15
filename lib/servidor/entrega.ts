import type { Sql } from "./db";
import { iso, mesaPorId, roteiroDoEvento, type LinhaMesa } from "./consultas";
import { avisarMudanca, recusa, registrar, type Autor, type Resultado } from "./acoes";
import { lerArquivo, salvarArquivo } from "./arquivos";
import { descricaoDaSkill, nomeValido } from "@/lib/exportacao/skill";
import { dividirSecoes, juntarSecoes } from "@/lib/markdown";
import { acharSensivel, mensagemSensivel } from "@/lib/sensivel";
import type { EntregaApi } from "@/lib/tipos-api";

// Entrega (Fase 7): nome da skill, seção Quando usar revisada e skill marcada
// como final (RN15). Só o gestor destrava.

export const LIMITE_NOME_SKILL = 60;

interface LinhaEntrega {
  nome_confirmado_em: Date | null;
  quando_revisado_em: Date | null;
  final_em: Date | null;
}

async function marcasDaEntrega(sql: Sql, mesaId: string): Promise<LinhaEntrega | null> {
  const [e] = await sql<LinhaEntrega[]>`
    select nome_confirmado_em, quando_revisado_em, final_em from entrega where mesa_id = ${mesaId}`;
  return e ?? null;
}

export async function montarEntrega(sql: Sql, mesa: LinhaMesa): Promise<EntregaApi> {
  const [e, skill] = await Promise.all([marcasDaEntrega(sql, mesa.id), lerArquivo(sql, mesa.id, "SKILL.md")]);
  const titulo = skill ? dividirSecoes(skill.conteudo).titulo : "";
  return {
    titulo,
    nomePasta: nomeValido(mesa.nome_skill || titulo),
    descricao: skill ? descricaoDaSkill(skill.conteudo) : "",
    nomeConfirmado: Boolean(e?.nome_confirmado_em),
    quandoRevisado: Boolean(e?.quando_revisado_em),
    final: mesa.final,
    finalEm: iso(e?.final_em ?? null),
  };
}

async function naEntrega(
  sql: Sql,
  mesaId: string,
  executar: (tx: Sql, mesa: LinhaMesa) => Promise<Resultado>,
): Promise<Resultado> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) return recusa("Mesa não encontrada.", 404);
  if (mesa.estado === "pausada") return recusa("A mesa está pausada.");
  if (mesa.final) return recusa("A skill já foi marcada como final. Só o gestor destrava.");
  const roteiro = await roteiroDoEvento(sql, mesa.evento_id);
  if (!(roteiro.passosPorFase.get(mesa.fase_atual) ?? []).some((p) => p.chave === "final")) {
    return recusa("A entrega é da Fase 7.", 403);
  }
  const r = await sql.begin(async (tx) => {
    await tx`insert into entrega (mesa_id) values (${mesa.id}) on conflict do nothing`;
    return executar(tx as unknown as Sql, mesa);
  });
  if (r.ok) await avisarMudanca(mesa);
  return r;
}

/** Confirma o nome da skill: vira o título do SKILL.md e o nome da pasta. */
export async function confirmarNome(sql: Sql, mesaId: string, nome: string): Promise<Resultado> {
  const limpo = nome.replace(/\s+/g, " ").trim();
  if (!limpo) return recusa("Escrevam o nome da skill.", 400);
  if (limpo.length > LIMITE_NOME_SKILL) return recusa(`O nome pode ter até ${LIMITE_NOME_SKILL} caracteres.`, 400);
  const achado = acharSensivel(limpo);
  if (achado) return recusa(mensagemSensivel(achado), 400);
  return naEntrega(sql, mesaId, async (tx, mesa) => {
    const skill = await lerArquivo(tx, mesa.id, "SKILL.md");
    if (!skill) return recusa("A pasta não tem o SKILL.md.");
    const partes = dividirSecoes(skill.conteudo);
    if (partes.titulo !== limpo) {
      partes.titulo = limpo;
      const salvo = await salvarArquivo(tx, mesa, "SKILL.md", juntarSecoes(partes), { autor: "mesa" });
      if (!salvo.ok) return salvo;
    }
    await tx`update mesa set nome_skill = ${nomeValido(limpo)}, versao = versao + 1 where id = ${mesa.id}`;
    await tx`update entrega set nome_confirmado_em = now() where mesa_id = ${mesa.id}`;
    return { ok: true };
  });
}

export async function revisarQuandoUsar(sql: Sql, mesaId: string): Promise<Resultado> {
  return naEntrega(sql, mesaId, async (tx, mesa) => {
    await tx`update entrega set quando_revisado_em = now() where mesa_id = ${mesa.id}`;
    return { ok: true };
  });
}

/** RN15: skill final fica travada para edição. */
export async function marcarFinal(sql: Sql, mesaId: string): Promise<Resultado> {
  return naEntrega(sql, mesaId, async (tx, mesa) => {
    const skill = await lerArquivo(tx, mesa.id, "SKILL.md");
    if (!skill) return recusa("A pasta não tem o SKILL.md.");
    await tx`update mesa set final = true, versao = versao + 1 where id = ${mesa.id}`;
    await tx`update entrega set final_em = now() where mesa_id = ${mesa.id}`;
    await registrar(tx, mesa.evento_id, mesa.id, "marcar_final", { perfil: "mesa", nome: "" });
    return { ok: true };
  });
}

/** Só o gestor destrava uma skill final (RN15). */
export async function destravarSkill(sql: Sql, mesaId: string, autor: Autor): Promise<Resultado> {
  const mesa = await mesaPorId(sql, mesaId);
  if (!mesa) return recusa("Mesa não encontrada.", 404);
  if (!mesa.final) return recusa("A skill desta mesa não está travada.");
  await sql`update mesa set final = false, versao = versao + 1 where id = ${mesa.id}`;
  await sql`update entrega set final_em = null where mesa_id = ${mesa.id}`;
  await registrar(sql, mesa.evento_id, mesa.id, "destravar", autor);
  await avisarMudanca(mesa);
  return { ok: true };
}

export async function dadosDaEntregaParaCriterios(sql: Sql, mesaId: string) {
  const e = await marcasDaEntrega(sql, mesaId);
  return { nomeConfirmado: Boolean(e?.nome_confirmado_em), quandoRevisado: Boolean(e?.quando_revisado_em) };
}
