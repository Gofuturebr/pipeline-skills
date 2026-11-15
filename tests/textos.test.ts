import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Critério de aceite do frontend: nenhum texto de interface usa travessões nem
// rótulos em caixa alta. Varre o código das telas e as mensagens do servidor.

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? arquivos(p) : /\.(tsx?|css)$/.test(n) ? [p] : [];
  });
}

const fontes = ["app", "components", "lib"].flatMap((d) => arquivos(path.join(process.cwd(), d)));

describe("textos de interface", () => {
  it("sem travessões", () => {
    const comTravessao = fontes.filter((f) => /[–—]/.test(readFileSync(f, "utf8")));
    expect(comTravessao).toEqual([]);
  });

  it("sem rótulos em caixa alta forçada por estilo", () => {
    const comCaixaAlta = fontes.filter((f) => /\buppercase\b|text-transform:\s*uppercase/.test(readFileSync(f, "utf8")));
    expect(comCaixaAlta).toEqual([]);
  });
});
