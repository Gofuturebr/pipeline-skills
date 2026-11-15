import type { NextRequest } from "next/server";
import { obterSql } from "@/lib/servidor/db";
import { eventoAtual } from "@/lib/servidor/consultas";
import { erro, exigirAdmin, protegida } from "@/lib/servidor/http";
import { respostaZip, zipConsolidado, zipDaSkill } from "@/lib/exportacao/pasta";

// Exportação do gestor: ?mesa=<id> baixa a skill de uma mesa; sem parâmetro,
// a pasta consolidada do evento, com LEIA-ME e o .zip de cada skill.
export async function GET(req: NextRequest) {
  const acesso = exigirAdmin(req, "exportar");
  if (!acesso.ok) return acesso.resposta;
  return protegida(async () => {
    const sql = obterSql();
    const mesaId = req.nextUrl.searchParams.get("mesa");
    if (mesaId) {
      const z = await zipDaSkill(sql, mesaId);
      if (!z) return erro("Esta mesa ainda não tem o SKILL.md.", 404);
      return respostaZip(z.nome, z.zip);
    }
    const evento = await eventoAtual(sql);
    if (!evento) return erro("Nenhum evento cadastrado.", 404);
    return respostaZip("skills-sebrae-inovapb", await zipConsolidado(sql, evento.id));
  });
}
