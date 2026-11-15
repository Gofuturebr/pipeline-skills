// RN14: nada com padrão de senha, chave de acesso, CPF ou CNPJ é salvo na pasta.
// Usado na tela (alerta antes de guardar) e no servidor (bloqueio ao salvar).

export type TipoSensivel = "cpf" | "cnpj" | "senha" | "chave";

export interface Achado {
  tipo: TipoSensivel;
  trecho: string;
}

const NOME: Record<TipoSensivel, string> = {
  cpf: "um CPF",
  cnpj: "um CNPJ",
  senha: "uma senha",
  chave: "uma chave de acesso",
};

function digitos(s: string): number[] {
  return s.replace(/\D/g, "").split("").map(Number);
}

function cpfValido(s: string): boolean {
  const d = digitos(s);
  if (d.length !== 11 || d.every((x) => x === d[0])) return false;
  for (const n of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += d[i] * (n + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== d[n]) return false;
  }
  return true;
}

function cnpjValido(s: string): boolean {
  const d = digitos(s);
  if (d.length !== 14 || d.every((x) => x === d[0])) return false;
  const pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (const n of [12, 13]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += d[i] * pesos[i + (13 - n)];
    const r = soma % 11;
    const dv = r < 2 ? 0 : 11 - r;
    if (dv !== d[n]) return false;
  }
  return true;
}

// Com pontuação, o formato já basta. Só números, exige dígitos verificadores
// válidos, para não confundir com telefone.
const CPF_FORMATADO = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/;
const CNPJ_FORMATADO = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/;
const SO_NUMEROS = /(?<![\d.\/-])\d{11}(?:\d{3})?(?![\d.\/-])/g;
const SENHA = /\b(?:senha|password|passwd|pwd)\s*[:=]\s*\S+/i;
const CHAVE_ROTULADA = /\b(?:chave(?:\s+de\s+acesso)?|token|api[\s_-]?key|access[\s_-]?key|secret)\s*[:=]\s*\S{8,}/i;
const CHAVE_CONHECIDA =
  /\b(?:sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,})/;

export function acharSensivel(texto: string): Achado | null {
  if (!texto) return null;
  const regras: [TipoSensivel, RegExp][] = [
    ["cpf", CPF_FORMATADO],
    ["cnpj", CNPJ_FORMATADO],
    ["senha", SENHA],
    ["chave", CHAVE_CONHECIDA],
    ["chave", CHAVE_ROTULADA],
  ];
  for (const [tipo, re] of regras) {
    const m = texto.match(re);
    if (m) return { tipo, trecho: m[0] };
  }
  for (const m of texto.matchAll(SO_NUMEROS)) {
    if (m[0].length === 11 && cpfValido(m[0])) return { tipo: "cpf", trecho: m[0] };
    if (m[0].length === 14 && cnpjValido(m[0])) return { tipo: "cnpj", trecho: m[0] };
  }
  return null;
}

/** Texto de alerta da seção 8 do frontend. */
export function mensagemSensivel(achado: Achado, acao = "guardar"): string {
  return `Isto parece ${NOME[achado.tipo]}. Troque por um dado fictício antes de ${acao}.`;
}

/** Troca dados sensíveis por um marcador. Rede de proteção para o texto que vem da IA. */
export function mascararSensivel(texto: string): string {
  let saida = texto;
  for (let i = 0; i < 20; i++) {
    const a = acharSensivel(saida);
    if (!a) break;
    saida = saida.replace(a.trecho, "[dado removido]");
  }
  return saida;
}
