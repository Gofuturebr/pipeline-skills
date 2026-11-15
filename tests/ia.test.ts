import { describe, expect, it } from "vitest";
import { acharSensivel, mascararSensivel, mensagemSensivel } from "@/lib/sensivel";
import { lerCampoParcial } from "@/lib/ia/json-parcial";
import { completarSecoes, nomeDaPasta, SECOES_SKILL } from "@/lib/ia/prompts/skill";
import { dividirSecoes, lerSecao, trocarSecao } from "@/lib/markdown";
import { SISTEMA_ENTREVISTA } from "@/lib/ia/prompts/entrevista";

describe("dados sensíveis (RN14)", () => {
  it("acha CPF, CNPJ, senha e chave de acesso", () => {
    expect(acharSensivel("CPF 123.456.789-09")?.tipo).toBe("cpf");
    expect(acharSensivel("cpf 52998224725")?.tipo).toBe("cpf");
    expect(acharSensivel("CNPJ 12.345.678/0001-95")?.tipo).toBe("cnpj");
    expect(acharSensivel("cnpj 11222333000181")?.tipo).toBe("cnpj");
    expect(acharSensivel("senha: abc123")?.tipo).toBe("senha");
    expect(acharSensivel("use sk-ant-abcdefghijklmnopqrstuv")?.tipo).toBe("chave");
    expect(acharSensivel("token = 9f8e7d6c5b4a3210")?.tipo).toBe("chave");
  });

  it("não confunde telefone, preço e data", () => {
    expect(acharSensivel("Ligue 83999998888")).toBeNull();
    expect(acharSensivel("Total: R$ 1.500,00, entrega em 10/12/2026")).toBeNull();
    expect(acharSensivel("a senha do wifi fica com a gerente")).toBeNull();
  });

  it("escreve o alerta da seção 8 e mascara o texto da IA", () => {
    expect(mensagemSensivel({ tipo: "cpf", trecho: "" })).toBe(
      "Isto parece um CPF. Troque por um dado fictício antes de guardar.",
    );
    expect(mascararSensivel("CPF 123.456.789-09 e senha: x1")).toBe("CPF [dado removido] e [dado removido]");
  });
});

describe("leitura parcial da resposta da IA", () => {
  it("lê o campo enquanto ele chega, com escapes", () => {
    expect(lerCampoParcial('{"temas_cobertos":[],"pergunta":"Como', "pergunta")).toBe("Como");
    expect(lerCampoParcial('{"pergunta":"Diga \\"oi\\"\\nagora"}', "pergunta")).toBe('Diga "oi"\nagora');
    expect(lerCampoParcial('{"pergunta":"ç\\u00e3o', "pergunta")).toBe("ção");
    expect(lerCampoParcial('{"temas_cobertos":["a"', "pergunta")).toBeNull();
  });
});

describe("SKILL.md", () => {
  it("completa as 7 seções e tira a cerca de código", () => {
    const texto = completarSecoes("```markdown\n# Minha skill\n\n## Passos\n1. Fazer.\n```");
    for (const s of SECOES_SKILL) expect(texto).toContain(`## ${s}`);
    expect(texto).not.toContain("```");
    expect(lerSecao(texto, "Passos")).toBe("1. Fazer.");
  });

  it("nome da pasta em minúsculas, sem acento", () => {
    expect(nomeDaPasta("# Orçamento pelo WhatsApp\n")).toBe("orcamento-pelo-whatsapp");
  });

  it("troca uma seção sem mexer nas outras", () => {
    const base = "# T\n\n## A\num\n\n## B\ndois\n";
    const novo = trocarSecao(base, "B", "três");
    expect(dividirSecoes(novo).secoes).toEqual([
      { nome: "A", corpo: "um" },
      { nome: "B", corpo: "três" },
    ]);
  });

  it("o prompt da entrevista pede uma pergunta por vez e não tem travessões", () => {
    expect(SISTEMA_ENTREVISTA).toContain("uma pergunta por vez");
    expect(SISTEMA_ENTREVISTA).not.toMatch(/[–—]/);
  });
});
