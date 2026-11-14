import { devices, expect, test, type Page } from "@playwright/test";

// Critério do Marco 2: um celular entra pelo QR, envia uma contribuição e ela
// aparece na fila da mesa.

async function forcarAte(admin: Page, mesa: string, fase: number) {
  const cartao = admin.getByRole("article", { name: new RegExp(mesa) });
  while (!(await cartao.textContent())?.includes(`Fase ${fase},`)) {
    await cartao.getByRole("button", { name: "Avançar" }).click();
    await admin.getByRole("button", { name: "Avançar mesmo assim" }).click();
    await expect(admin.getByRole("dialog")).toHaveCount(0);
  }
}

test("o celular entra pelo QR, envia uma contribuição e ela aparece na fila da mesa", async ({ browser }) => {
  const notebook = await browser.newContext();
  const mesa = await notebook.newPage();
  const admin = await notebook.newPage();
  const telefone = await browser.newContext({ ...devices["Pixel 7"] });
  const celular = await telefone.newPage();

  // O QR da tela da mesa leva para /p/[codigo].
  await mesa.goto("/mesa/R4TW9H");
  const qr = mesa.getByRole("img", { name: "QR para entrar na mesa pelo celular" });
  await expect(qr).toBeVisible();
  const endereco = await mesa.locator("figcaption .font-mono").textContent();
  expect(endereco).toMatch(/\/p\/R4TW9H$/);

  await celular.goto("/p/R4TW9H");
  await celular.getByLabel("Seu primeiro nome").fill("Joana");
  await celular.getByRole("button", { name: "Entrar na mesa" }).click();
  await expect(celular.getByText("Você entrou como")).toBeVisible();
  await expect(celular.getByText("A mesa ainda vai distribuir os papéis.")).toBeVisible();

  // A mesa vê quem entrou, sem recarregar.
  await expect(mesa.getByRole("listitem").filter({ hasText: "Joana" })).toBeVisible({ timeout: 2000 });

  // O papel escolhido na mesa aparece no celular.
  await mesa.getByRole("button", { name: "Passo concluído" }).click();
  const cetico = mesa.getByRole("listitem").filter({ has: mesa.getByRole("heading", { name: "Cético", exact: true }) });
  await cetico.getByLabel("Quem fica com este papel").selectOption({ label: "Joana" });
  await expect(celular.getByText("Escreve as conferências da prova")).toBeVisible({ timeout: 2000 });

  // Na Fase 1, o celular ganha o campo de envio.
  await admin.goto("/admin/entrar");
  await admin.getByLabel("Seu nome").fill("Gestora");
  await admin.getByLabel("Senha").fill("gestor-e2e");
  await admin.getByRole("button", { name: "Entrar" }).click();
  await forcarAte(admin, "Mesa 02", 1);
  await expect(celular.getByLabel("Uma dúvida ou um caso parecido que você já viveu")).toBeVisible({ timeout: 3000 });

  await celular.getByLabel("Uma dúvida ou um caso parecido que você já viveu").fill("E se o cliente pedir mais prazo?");
  const inicio = Date.now();
  await celular.getByRole("button", { name: "Enviar para a mesa" }).click();
  await expect(celular.getByText("Enviado para a mesa")).toBeVisible();

  const item = mesa.getByRole("article").filter({ hasText: "E se o cliente pedir mais prazo?" });
  await expect(item).toBeVisible({ timeout: 2000 });
  console.log(`Contribuição apareceu na mesa em ${Date.now() - inicio} ms`);
  await expect(item).toContainText("Enviado por Joana");

  await item.getByRole("button", { name: "Aceitar" }).click();
  await expect(celular.getByText("Aceitas pela mesa: 1")).toBeVisible({ timeout: 2000 });

  await mesa.screenshot({ path: "test-results/marco2-mesa-fila.png" });
  await celular.screenshot({ path: "test-results/marco2-celular.png" });
  await notebook.close();
  await telefone.close();
});

test("cartões com QR para imprimir, só para o gestor", async ({ page }) => {
  await page.goto("/admin/entrar");
  await page.getByLabel("Seu nome").fill("Gestora");
  await page.getByLabel("Senha").fill("gestor-e2e");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("link", { name: "Cartões com QR" }).click();
  await expect(page.getByRole("heading", { name: "Cartões das mesas" })).toBeVisible();
  await expect(page.getByRole("img", { name: /QR da Mesa/ })).toHaveCount(3);
  await page.screenshot({ path: "test-results/marco2-cartoes.png", fullPage: true });
});
