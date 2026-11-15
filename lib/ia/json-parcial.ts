// Lê o valor de um campo de texto de um JSON que ainda está chegando aos
// pedaços. Serve para mostrar a pergunta (ou o resultado) enquanto a IA escreve,
// mesmo com a resposta em formato estruturado.

export function lerCampoParcial(json: string, campo: string): string | null {
  const chave = `"${campo}"`;
  let i = json.indexOf(chave);
  if (i < 0) return null;
  i += chave.length;
  while (i < json.length && /\s/.test(json[i])) i++;
  if (json[i] !== ":") return null;
  i++;
  while (i < json.length && /\s/.test(json[i])) i++;
  if (json[i] !== '"') return null;
  i++;
  let saida = "";
  while (i < json.length) {
    const c = json[i];
    if (c === '"') return saida;
    if (c === "\\") {
      const prox = json[i + 1];
      if (prox === undefined) return saida;
      if (prox === "u") {
        const hex = json.slice(i + 2, i + 6);
        if (hex.length < 4) return saida;
        saida += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      const mapa: Record<string, string> = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", '"': '"', "\\": "\\", "/": "/" };
      saida += mapa[prox] ?? prox;
      i += 2;
      continue;
    }
    saida += c;
    i++;
  }
  return saida;
}
