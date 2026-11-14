// Regras do participante, usadas no celular e no servidor.

/** Só o primeiro nome (seção 8: privacidade). */
export const LIMITE_NOME = 30;
/** Limite de cada contribuição (seção 6 do frontend). */
export const LIMITE_CONTRIBUICAO = 280;

export function limparNome(texto: string): string {
  return texto.replace(/\s+/g, " ").trim().slice(0, LIMITE_NOME);
}

export function limparContribuicao(texto: string): string {
  return texto.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
