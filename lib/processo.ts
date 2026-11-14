// Ficha do processo pré-curado (seção 5 da especificação). Os campos ficam em
// processo.ficha, no banco, e são mostrados nesta ordem.

export const CAMPOS_FICHA = [
  { chave: "objetivo", rotulo: "Objetivo" },
  { chave: "quemExecuta", rotulo: "Quem executa" },
  { chave: "frequencia", rotulo: "Frequência" },
  { chave: "entradas", rotulo: "Entradas" },
  { chave: "resultadoEsperado", rotulo: "Resultado esperado" },
] as const;

export type CampoFicha = (typeof CAMPOS_FICHA)[number]["chave"];
export type Ficha = Partial<Record<CampoFicha, string>>;

export function lerFicha(bruta: unknown): Ficha {
  const ficha: Ficha = {};
  if (!bruta || typeof bruta !== "object") return ficha;
  for (const { chave } of CAMPOS_FICHA) {
    const valor = (bruta as Record<string, unknown>)[chave];
    if (typeof valor === "string" && valor.trim()) ficha[chave] = valor.trim();
  }
  return ficha;
}
