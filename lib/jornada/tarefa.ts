// Tarefa em uma linha (Fase 1): até 90 caracteres, com verbo e resultado.
// O sistema confere o tamanho e se há pelo menos três palavras. Se tem verbo e
// resultado, quem confirma é a mesa (docs/decisoes.md).

export const LIMITE_TAREFA = 90;
const MINIMO_PALAVRAS = 3;

export function limparTarefa(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

/** Devolve o que falta, escrito para a mesa, ou null se a frase serve. */
export function problemaDaTarefa(texto: string): string | null {
  const limpo = limparTarefa(texto);
  if (!limpo) return "Escrevam a tarefa antes de confirmar.";
  if (limpo.length > LIMITE_TAREFA) return `A tarefa pode ter até ${LIMITE_TAREFA} caracteres.`;
  if (limpo.split(" ").length < MINIMO_PALAVRAS) {
    return "Escrevam a tarefa com verbo e resultado, por exemplo: Responder pedido com preço e prazo.";
  }
  return null;
}
