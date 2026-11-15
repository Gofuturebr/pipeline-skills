import { expect, test } from "@playwright/test";

// Marco 5 no navegador: o gestor forma os pares do teste cruzado e baixa a
// pasta consolidada. O fluxo completo entre duas mesas é testado na integração
// (tests/integracao/marco5.test.ts).

test("gestor inicia o teste cruzado e exporta a pasta consolidada", async ({ page }) => {
  await page.goto("/admin/entrar");
  await page.getByLabel("Seu nome").fill("Gestora");
  await page.getByLabel("Senha").fill("gestor-e2e");
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.getByRole("button", { name: "Iniciar teste cruzado" }).click();
  await expect(page.getByText("Pares do teste cruzado formados.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar teste cruzado" })).toBeDisabled();

  // Com 3 mesas, o ciclo: a Mesa 01 testa a Mesa 02.
  await page.getByRole("article", { name: /Mesa 01/ }).getByRole("button").first().click();
  await expect(page.getByLabel("Esta mesa testa a skill da")).toHaveValue(/.+/);

  const resposta = await page.request.get("/api/admin/exportar");
  expect(resposta.status()).toBe(200);
  expect(resposta.headers()["content-type"]).toBe("application/zip");
  const corpo = await resposta.body();
  expect(corpo.subarray(0, 2).toString()).toBe("PK");
});

test("facilitador não exporta nem forma pares", async ({ page }) => {
  await page.goto("/admin/entrar");
  await page.getByLabel("Seu nome").fill("Facilitador");
  await page.getByLabel("Senha").fill("facilitador-e2e");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /InovaPB/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar teste cruzado" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Exportar todas (.zip)" })).toHaveCount(0);
  expect((await page.request.get("/api/admin/exportar")).status()).toBe(403);
});
