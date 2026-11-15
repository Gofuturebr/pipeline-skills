// Conferências da prova (RN08): cada uma diz o que confere e contra qual fonte,
// sem palavras vagas. Usado na tela (aviso ao sair do campo) e no servidor.

export const MINIMO_CONFERENCIAS = 5;
export const MAXIMO_CONFERENCIAS = 10;

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function palavraVaga(texto: string, palavrasVagas: readonly string[]): string | null {
  const t = semAcento(texto);
  for (const p of palavrasVagas) {
    const alvo = semAcento(p.trim());
    if (!alvo) continue;
    const re = new RegExp(`(^|[^a-z0-9])${alvo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
    if (re.test(t)) return p.trim();
  }
  return null;
}

/** O motivo da recusa, escrito para a mesa, ou null se a conferência vale. */
export function motivoDaRecusa(descricao: string, fonte: string, palavrasVagas: readonly string[]): string | null {
  if (!descricao.trim()) return "Falta dizer o que confere";
  const vaga = palavraVaga(`${descricao} ${fonte}`, palavrasVagas);
  if (vaga) return `A palavra '${vaga}' não dá para conferir. Troque por algo que se possa contar ou comparar`;
  if (!fonte.trim()) return "Falta dizer contra qual fonte";
  return null;
}

/** Linha da seção Pronto quando do SKILL.md. */
export function linhaProntoQuando(descricao: string, fonte: string): string {
  return `- [ ] ${descricao.trim()} (fonte: ${fonte.trim()})`;
}

/** Lê as linhas "- [ ] ... (fonte: ...)" da seção Pronto quando. */
export function lerProntoQuando(corpo: string): { descricao: string; fonte: string }[] {
  const itens: { descricao: string; fonte: string }[] = [];
  for (const linha of corpo.split("\n")) {
    const m = linha.match(/^\s*[-*]\s+(?:\[[ xX]\]\s+)?(.+?)\s*$/);
    if (!m) continue;
    const f = m[1].match(/^(.*?)\s*\(fonte:\s*(.*?)\)\s*\.?$/i);
    itens.push(f ? { descricao: f[1].trim(), fonte: f[2].trim() } : { descricao: m[1].trim(), fonte: "" });
  }
  return itens;
}
