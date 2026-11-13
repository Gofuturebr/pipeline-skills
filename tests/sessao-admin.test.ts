import { beforeAll, describe, expect, it } from "vitest";
import { criarSessao, lerSessao, perfilPelaSenha } from "@/lib/servidor/sessao-admin";
import { pode } from "@/lib/permissoes";

beforeAll(() => {
  process.env.SESSION_SECRET = "segredo-de-teste-com-mais-de-16";
  process.env.ADMIN_PASSWORD = "senha-gestor";
  process.env.FACILITADOR_PASSWORD = "senha-facilitador";
});

describe("sessão do admin", () => {
  it("lê de volta a sessão assinada", () => {
    const s = lerSessao(criarSessao("gestor", "Ana"));
    expect(s?.perfil).toBe("gestor");
    expect(s?.nome).toBe("Ana");
  });

  it("recusa cookie alterado ou vencido", () => {
    const valor = criarSessao("facilitador", "Bia");
    const [corpo, assinatura] = valor.split(".");
    const falso = Buffer.from(JSON.stringify({ perfil: "gestor", nome: "Bia", expira: Date.now() + 1e6 })).toString("base64url");
    expect(lerSessao(`${falso}.${assinatura}`)).toBeNull();
    expect(lerSessao(`${corpo}.x${assinatura}`)).toBeNull();
    expect(lerSessao(criarSessao("gestor", "Ana", 0), Date.now())).toBeNull();
  });

  it("descobre o perfil pela senha", () => {
    expect(perfilPelaSenha("senha-gestor")).toBe("gestor");
    expect(perfilPelaSenha("senha-facilitador")).toBe("facilitador");
    expect(perfilPelaSenha("errada")).toBeNull();
    expect(perfilPelaSenha("")).toBeNull();
  });

  it("facilitador libera fases e atende chamados, mas não pausa, não ajusta tempo, não prepara e não exporta", () => {
    for (const a of ["avancar", "voltar", "forcar", "atender_chamado"] as const) expect(pode("facilitador", a)).toBe(true);
    for (const a of ["pausar", "pausar_todas", "ajustar_tempo", "ajustar_tempo_todas", "preparo", "exportar", "configurar_evento", "enviar_aviso"] as const) {
      expect(pode("facilitador", a)).toBe(false);
    }
  });
});
