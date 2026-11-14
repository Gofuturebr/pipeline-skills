// Rascunhos de texto guardados no navegador a cada tecla (seção 3 do frontend).
// O armazenamento pode falhar (aba anônima, cota cheia): nada quebra se falhar.

export function lerRascunho(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

export function guardarRascunho(chave: string, valor: string): void {
  try {
    if (valor) window.localStorage.setItem(chave, valor);
    else window.localStorage.removeItem(chave);
  } catch {
    // Sem armazenamento, o texto fica só na tela.
  }
}
