import { devices, expect, test, type Page } from "@playwright/test";

// Critérios de aceite do frontend (docs/frontend.md, seção 8) que dependem do
// navegador. O mapa completo está em docs/aceite.md.

async function entrar(page: Page, senha = "gestor-e2e", nome = "Gestora") {
  await page.goto("/admin/entrar");
  await page.getByLabel("Seu nome").fill(nome);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /InovaPB/ })).toBeVisible();
}

test("antes de iniciar o evento, o gestor adiciona uma mesa pelo painel", async ({ browser }) => {
  const contexto = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await contexto.newPage();
  await entrar(page);
  const antes = await page.getByRole("article").count();
  await page.getByRole("button", { name: "Adicionar mesa" }).click();
  await expect(page.getByText(/criada, código [A-Z0-9]{6}/)).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(antes + 1);
  // Com um processo só no evento, a mesa nova já vem com ele.
  await expect(page.getByRole("article").last()).toContainText("Planejar um evento");
  await contexto.close();
});

test("o painel mostra 20 mesas sem rolagem em 1440 por 900", async ({ browser }) => {
  const contexto = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await contexto.newPage();
  await entrar(page);
  const preparo = await (await page.request.get("/api/admin/preparo")).json();
  for (let i = preparo.mesas.length; i < 20; i++) {
    const r = await page.request.post("/api/admin/preparo/mesa", { data: { nome: "", processoId: preparo.processos[0].id } });
    expect(r.ok()).toBe(true);
  }
  await page.reload();
  await expect(page.getByRole("article")).toHaveCount(20);
  const { sh, ch, sw, cw } = await page.evaluate(() => ({
    sh: document.documentElement.scrollHeight,
    ch: document.documentElement.clientHeight,
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(sw).toBeLessThanOrEqual(cw);
  expect(sh).toBeLessThanOrEqual(ch);
  // Todos os cartões cabem na tela.
  const ultimo = await page.getByRole("article").last().boundingBox();
  expect(ultimo!.y + ultimo!.height).toBeLessThanOrEqual(900);
  await page.screenshot({ path: "test-results/aceite-20-mesas.png" });
  await contexto.close();
});

test("sem rede, a mesa continua digitando e, ao religar, volta ao passo certo sem perder o texto", async ({ browser }) => {
  const contexto = await browser.newContext();
  const admin = await contexto.newPage();
  await entrar(admin);
  // Uma mesa nova, levada pela API até o passo da tarefa em uma linha (Fase 1, passo 4).
  await admin.request.post("/api/admin/preparo/mesa", { data: { nome: "Mesa sem rede", processoId: null } });
  const preparo = await (await admin.request.get("/api/admin/preparo")).json();
  const m = preparo.mesas.find((x: { nome: string }) => x.nome === "Mesa sem rede");
  await admin.request.post("/api/admin/preparo/mesa", { data: { id: m.id, nome: m.nome, processoId: preparo.processos[0].id } });
  expect((await admin.request.post(`/api/admin/mesas/${m.id}/forcar`, { data: {} })).ok()).toBe(true);
  const estado = await (await admin.request.get(`/api/mesa/${m.codigo}/estado`)).json();
  const passos = estado.fases[1].passos as { id: string; ordem: number; config: { conteudo?: string } }[];
  for (const p of passos.slice(0, 3)) {
    if (p.config.conteudo === "ficha" || p.config.conteudo === "kit") {
      await admin.request.post(`/api/mesa/${m.codigo}/leitura`, { data: { passoId: p.id, lido: true } });
    }
    expect((await admin.request.post(`/api/mesa/${m.codigo}/passo/concluir`, { data: { passoId: p.id } })).ok()).toBe(true);
  }

  const mesa = await contexto.newPage();
  await mesa.goto(`/mesa/${m.codigo}`);
  await expect(mesa.getByLabel("A tarefa em uma linha")).toBeVisible();
  await contexto.setOffline(true);
  await expect(mesa.getByText("Sem conexão. Continuem escrevendo, nada se perde.")).toBeVisible({ timeout: 20000 });
  await mesa.getByLabel("A tarefa em uma linha").fill("Responder pedido escrito sem internet");
  await contexto.setOffline(false);
  await mesa.reload();
  await expect(mesa.getByLabel("A tarefa em uma linha")).toHaveValue("Responder pedido escrito sem internet");
  await expect(mesa.getByText("Fase 1, passo 4 de 4")).toBeVisible();
  await contexto.close();
});

test("a fase liberada no admin aparece no celular com o anúncio", async ({ browser }) => {
  const notebook = await browser.newContext();
  const admin = await notebook.newPage();
  const tel = await browser.newContext({ ...devices["Pixel 7"] });
  const celular = await tel.newPage();
  await entrar(admin);
  await celular.goto("/p/K7PX2M");
  await celular.getByLabel("Seu primeiro nome").fill("Rita");
  await celular.getByRole("button", { name: "Entrar na mesa" }).click();
  await expect(celular.getByText("Você entrou como")).toBeVisible();
  const fase = Number((await celular.getByText(/^Fase \d$/).textContent())?.replace("Fase ", ""));
  const cartao = admin.getByRole("article", { name: /Mesa 01/ });
  await cartao.getByRole("button", { name: "Avançar" }).click();
  const forcar = admin.getByRole("button", { name: "Avançar mesmo assim" });
  if (await forcar.isVisible().catch(() => false)) await forcar.click();
  await expect(celular.getByRole("paragraph").filter({ hasText: `Fase ${fase + 1} liberada` })).toBeVisible({ timeout: 2000 });
  await notebook.close();
  await tel.close();
});

test("o facilitador não vê pausa geral, preparo nem exportação", async ({ page }) => {
  await entrar(page, "facilitador-e2e", "Facilitador");
  await expect(page.getByRole("button", { name: "Pausar todas" })).toHaveCount(0);
  await expect(page.getByText("Mais", { exact: true })).toHaveCount(0);
  expect((await page.request.get("/api/admin/preparo")).status()).toBe(403);
  expect((await page.request.post("/api/admin/todas/pausar", { data: {} })).status()).toBe(403);
  await page.goto("/admin/preparo");
  await expect(page).toHaveURL(/\/admin$/);
});
