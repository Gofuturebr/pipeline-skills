import { expect, test, type Page } from "@playwright/test";

// Critério do Marco 1: admin e duas mesas em três abas. Avançar uma mesa muda
// só ela, em até 2 segundos. A mesa não consegue abrir fase não liberada.

async function entrarNoAdmin(page: Page) {
  await page.goto("/admin/entrar");
  await page.getByLabel("Seu nome").fill("Gestora");
  await page.getByLabel("Senha").fill("gestor-e2e");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /InovaPB/ })).toBeVisible();
}

function faseAtualNaTrilha(page: Page) {
  return page.getByRole("navigation", { name: "Trilha das fases" }).locator('[aria-current="step"]').first();
}

test("avançar uma mesa no admin muda só ela, em até 2 segundos", async ({ browser }) => {
  const contexto = await browser.newContext();
  const admin = await contexto.newPage();
  const mesa1 = await contexto.newPage();
  const mesa2 = await contexto.newPage();

  await entrarNoAdmin(admin);
  await mesa1.goto("/mesa/K7PX2M");
  await mesa2.goto("/mesa/R4TW9H");
  for (const m of [mesa1, mesa2]) {
    await expect(m.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(faseAtualNaTrilha(m)).toContainText("Check-in");
    await expect(m.getByText("Conectado")).toBeVisible();
  }

  // A mesa não consegue abrir fase não liberada: as fases futuras não são botões.
  const trilha = mesa1.getByRole("navigation", { name: "Trilha das fases" });
  await expect(trilha.getByRole("button", { name: /Processo/ })).toHaveCount(0);
  await expect(trilha.getByText("Processo")).toBeVisible();

  // Forçar o avanço da Mesa 01 no admin.
  const cartao = admin.getByRole("article", { name: /Mesa 01/ });
  await cartao.getByRole("button", { name: "Avançar" }).click();
  await expect(admin.getByRole("dialog")).toContainText("Avançar mesmo assim?");
  const inicio = Date.now();
  await admin.getByRole("button", { name: "Avançar mesmo assim" }).click();

  await expect(faseAtualNaTrilha(mesa1)).toContainText("Processo", { timeout: 2000 });
  const decorrido = Date.now() - inicio;
  console.log(`Mesa 01 mudou de fase em ${decorrido} ms`);
  expect(decorrido).toBeLessThan(2000);

  // A Mesa 02 continua na Fase 0.
  await mesa2.waitForTimeout(500);
  await expect(faseAtualNaTrilha(mesa2)).toContainText("Check-in");
  await expect(cartao).toContainText("Fase 1");
  await expect(admin.getByRole("article", { name: /Mesa 02/ })).toContainText("Fase 0");

  // A mudança de fase feita no admin aparece com o anúncio.
  await mesa1.screenshot({ path: "test-results/marco1-mesa1.png" });
  await admin.screenshot({ path: "test-results/marco1-admin.png" });
  await contexto.close();
});

test("a mesa conclui passos, declara a fase e o gestor libera", async ({ browser }) => {
  const contexto = await browser.newContext();
  const admin = await contexto.newPage();
  const mesa = await contexto.newPage();
  await entrarNoAdmin(admin);
  await mesa.goto("/mesa/B8NC3F");

  for (let i = 0; i < 2; i++) {
    await mesa.getByRole("button", { name: "Passo concluído" }).click();
  }
  await mesa.getByRole("button", { name: "Concluímos a fase" }).click();
  await expect(mesa.getByRole("heading", { name: "Fase concluída. Aguardando liberação." })).toBeVisible();
  // A mesa continua na Fase 0 até o gestor liberar.
  await expect(faseAtualNaTrilha(mesa)).toContainText("Check-in");

  const cartao = admin.getByRole("article", { name: /Mesa 03/ });
  await expect(cartao).toContainText("Pronta", { timeout: 2000 });
  await cartao.getByRole("button", { name: "Avançar" }).click();
  await expect(mesa.getByRole("paragraph").filter({ hasText: "Fase 1 liberada: Entender o processo" })).toBeVisible({ timeout: 2000 });
  await expect(faseAtualNaTrilha(mesa)).toContainText("Processo");
  await mesa.screenshot({ path: "test-results/marco1-mesa3-fase1.png" });
  await contexto.close();
});

test("tela da mesa sem rolagem de página em 1366 por 768", async ({ page }) => {
  await page.goto("/mesa/R4TW9H");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const { sw, sh, cw, ch } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    sh: document.documentElement.scrollHeight,
    cw: document.documentElement.clientWidth,
    ch: document.documentElement.clientHeight,
  }));
  expect(sw).toBeLessThanOrEqual(cw);
  expect(sh).toBeLessThanOrEqual(ch);
});

test("código inválido mostra a mensagem certa", async ({ page }) => {
  await page.goto("/mesa/NAOEXISTE");
  await expect(page.getByRole("heading", { name: "Não encontramos esta mesa. Confira o código no cartão da mesa." })).toBeVisible();
});
