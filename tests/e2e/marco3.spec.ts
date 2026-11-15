import { expect, test } from "@playwright/test";

// Critério do Marco 3: uma entrevista completa faz o SKILL.md aparecer na pasta.
// (A recusa com 5 perguntas é testada na integração: tests/integracao/marco3.test.ts.)
// Os testes de navegador usam a IA simulada (IA_SIMULADA=1 no playwright.config.ts).

test("entrevista completa: o SKILL.md aparece na Pasta viva e a mesa aprova", async ({ browser }) => {
  const contexto = await browser.newContext();
  const admin = await contexto.newPage();
  const mesa = await contexto.newPage();

  await admin.goto("/admin/entrar");
  await admin.getByLabel("Seu nome").fill("Gestora");
  await admin.getByLabel("Senha").fill("gestor-e2e");
  await admin.getByRole("button", { name: "Entrar" }).click();
  const cartao = admin.getByRole("article", { name: /Mesa 03/ });
  while (!(await cartao.textContent())?.includes("Fase 2,")) {
    await cartao.getByRole("button", { name: "Avançar" }).click();
    const forcar = admin.getByRole("button", { name: "Avançar mesmo assim" });
    if (await forcar.isVisible().catch(() => false)) await forcar.click();
    await expect(admin.getByRole("dialog")).toHaveCount(0);
    await admin.waitForTimeout(300);
  }

  await mesa.goto("/mesa/B8NC3F");
  const pergunta = mesa.getByRole("region", { name: "Pergunta da IA" });
  await expect(pergunta).toContainText("Pergunta 1:", { timeout: 5000 });
  await expect(mesa.getByText("Falta 8 perguntas e cobrir 8 temas para poder encerrar a entrevista.")).toBeVisible();

  for (let i = 1; i <= 8; i++) {
    await mesa.getByLabel("Resposta da mesa").fill(`Resposta número ${i}, com um caso real.`);
    await mesa.getByLabel("Resposta da mesa").press("Enter");
    await expect(pergunta).toContainText(`Respondidas: ${i} de 8.`);
  }
  await mesa.getByRole("button", { name: "Encerrar entrevista" }).click();
  await expect(mesa.getByText("Entrevista encerrada.")).toBeVisible();
  await mesa.getByRole("button", { name: "Passo concluído" }).click();

  await mesa.getByRole("button", { name: "Pedir à IA para escrever o SKILL.md" }).click();
  await expect(mesa.getByText("O SKILL.md está na pasta.")).toBeVisible({ timeout: 10000 });
  const pasta = mesa.getByRole("region", { name: "Pasta viva" });
  await expect(pasta.getByRole("button", { name: /SKILL\.md/ })).toBeVisible();
  await expect(pasta).toContainText("/orcamento-pelo-whatsapp");

  await mesa.getByRole("button", { name: "Passo concluído" }).click();
  await mesa.getByRole("button", { name: "Aprovar o SKILL.md" }).click();
  await expect(mesa.getByText("Aprovado. Esta é a versão 1.")).toBeVisible();
  await expect(mesa.getByRole("button", { name: "Concluímos a fase" })).toBeEnabled();

  // A Pasta viva abre o arquivo, com o histórico de versões.
  await pasta.getByRole("button", { name: /SKILL\.md/ }).click();
  const visualizador = mesa.getByRole("dialog", { name: "Arquivo SKILL.md" });
  await expect(visualizador).toContainText("Pra que serve");
  await visualizador.getByRole("button", { name: "Ver versões anteriores" }).click();
  await expect(visualizador.getByRole("button", { name: /Versão 1, atual/ })).toBeVisible();
  await mesa.screenshot({ path: "test-results/marco3-visualizador.png" });
  await visualizador.getByRole("button", { name: "Fechar" }).click();
  await contexto.close();
});
