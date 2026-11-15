// O que cada perfil do admin pode fazer (seção 5 da especificação e CLAUDE.md).
// O facilitador avança, volta e força a fase de uma mesa e atende chamados.
// As demais ações são só do gestor. O servidor confere em cada rota; a
// interface usa a mesma tabela para esconder o que o perfil não pode usar.

export type Perfil = "gestor" | "facilitador";

export type AcaoAdmin =
  | "avancar"
  | "voltar"
  | "forcar"
  | "desfazer"
  | "atender_chamado"
  | "pausar"
  | "retomar"
  | "ajustar_tempo"
  | "enviar_aviso"
  | "avancar_prontas"
  | "avancar_todas"
  | "pausar_todas"
  | "retomar_todas"
  | "ajustar_tempo_todas"
  | "aviso_todas"
  | "configurar_evento"
  | "preparo"
  | "exportar"
  | "destravar"
  | "teste_cruzado";

const DO_FACILITADOR: ReadonlySet<AcaoAdmin> = new Set<AcaoAdmin>([
  "avancar",
  "voltar",
  "forcar",
  "desfazer",
  "atender_chamado",
]);

export function pode(perfil: Perfil, acao: AcaoAdmin): boolean {
  if (perfil === "gestor") return true;
  return DO_FACILITADOR.has(acao);
}
