import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { SKILL_SIMULADA } from "../../lib/ia/simulada";

// Critério do Marco 4: uma conferência com a palavra "profissional" é recusada
// e o placar aparece depois de rodar a tarefa. IA simulada (playwright.config.ts).

test("conferência vaga é recusada e o placar aparece depois de rodar", async ({ browser }) => {
  const contexto = await browser.newContext();
  const admin = await contexto.newPage();
  const mesa = await contexto.newPage();

  await admin.goto("/admin/entrar");
  await admin.getByLabel("Seu nome").fill("Gestora");
  await admin.getByLabel("Senha").fill("gestor-e2e");
  await admin.getByRole("button", { name: "Entrar" }).click();
  const cartao = admin.getByRole("article", { name: /Mesa 02/ });
  while (!(await cartao.textContent())?.includes("Fase 4,")) {
    await cartao.getByRole("button", { name: "Avançar" }).click();
    const forcar = admin.getByRole("button", { name: "Avançar mesmo assim" });
    if (await forcar.isVisible().catch(() => false)) await forcar.click();
    await expect(admin.getByRole("dialog")).toHaveCount(0);
    await admin.waitForTimeout(300);
  }

  // A pasta precisa de um SKILL.md para rodar: entra direto no banco de teste.
  const sql = postgres(process.env.DATABASE_URL_TESTE!, { max: 1 });
  await sql`
    insert into arquivo (mesa_id, caminho, conteudo, fase_alterada, autor)
    select id, 'SKILL.md', ${SKILL_SIMULADA}, 2, 'ia' from mesa where codigo = 'R4TW9H'
    on conflict (mesa_id, caminho) do nothing`;
  await sql.end();

  await mesa.goto("/mesa/R4TW9H");
  await mesa.getByRole("button", { name: "Acrescentar conferência" }).click();
  await mesa.getByLabel("O que confere").last().fill("A mensagem está profissional");
  await mesa.getByLabel("Contra qual fonte").last().fill("exemplo bom do kit");
  await mesa.getByLabel("O que confere").last().blur();
  await mesa.getByRole("heading", { level: 2 }).click();
  await expect(
    mesa.getByText("A palavra 'profissional' não dá para conferir. Troque por algo que se possa contar ou comparar"),
  ).toBeVisible();
  await mesa.getByRole("button", { name: "Tirar" }).first().click();

  const itens = [
    ["O valor bate com o boleto", "lista de boletos do kit"],
    ["O vencimento original aparece", "lista de boletos do kit"],
    ["A forma de pagamento aparece", "mensagem"],
    ["O prazo de resposta tem dia", "mensagem"],
    ["O nome do cliente aparece", "caso"],
  ];
  for (const [i, [o, f]] of itens.entries()) {
    await mesa.getByRole("button", { name: "Acrescentar conferência" }).click();
    await mesa.getByLabel("O que confere").last().fill(o);
    await mesa.getByLabel("Contra qual fonte").last().fill(f);
    await mesa.getByRole("heading", { level: 2 }).click();
    await expect(mesa.getByText(`Válidas: ${i + 1}. A prova pede de 5 a 10.`)).toBeVisible();
  }
  await expect(mesa.getByText("Válidas: 5. A prova pede de 5 a 10.")).toBeVisible();
  await mesa.getByRole("button", { name: "Passo concluído" }).click();
  await mesa.getByRole("button", { name: "Rodar a tarefa e conferir" }).click();
  await expect(mesa.getByText("5 de 5 passaram")).toBeVisible({ timeout: 10000 });
  await mesa.screenshot({ path: "test-results/marco4-placar.png" });
  await contexto.close();
});
