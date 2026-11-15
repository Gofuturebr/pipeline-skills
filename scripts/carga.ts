// Teste de carga (Marco 6): simula 20 mesas e 100 celulares conectados ao mesmo
// tempo contra um servidor já rodando, com mudanças de fase pelo admin.
//
//   npx tsx scripts/carga.ts --url http://localhost:3100 --senha <senha do gestor> \
//     --mesas 20 --celulares 100 --segundos 60
//
// Use um banco de teste: o script cria mesas que faltarem e muda fases.
// Mede o tempo de resposta das rotas, os erros e quanto tempo uma mudança de
// fase feita no admin leva para chegar à mesa pelo canal de tempo real.

const argumentos = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) argumentos.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
const URL_BASE = argumentos.get("url") ?? "http://localhost:3100";
const SENHA = argumentos.get("senha") ?? process.env.ADMIN_PASSWORD ?? "";
const N_MESAS = Number(argumentos.get("mesas") ?? 20);
const N_CELULARES = Number(argumentos.get("celulares") ?? 100);
const SEGUNDOS = Number(argumentos.get("segundos") ?? 60);

const tempos = new Map<string, number[]>();
const erros = new Map<string, number>();
const propagacoes: number[] = [];
let ativo = true;

function anotar(rota: string, ms: number, ok: boolean) {
  if (!tempos.has(rota)) tempos.set(rota, []);
  tempos.get(rota)!.push(ms);
  if (!ok) erros.set(rota, (erros.get(rota) ?? 0) + 1);
}

async function chamar(rota: string, url: string, init: RequestInit = {}): Promise<Response | null> {
  const t = performance.now();
  try {
    const r = await fetch(`${URL_BASE}${url}`, init);
    anotar(rota, performance.now() - t, r.ok);
    return r;
  } catch {
    anotar(rota, performance.now() - t, false);
    return null;
  }
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms: number) => ms * (0.75 + Math.random() * 0.5);

function percentil(lista: number[], p: number) {
  const o = [...lista].sort((a, b) => a - b);
  return o.length ? o[Math.min(o.length - 1, Math.floor((p / 100) * o.length))] : 0;
}

/** Abre o canal de sinais (SSE) e chama aoSinal a cada evento. */
function ouvir(canais: string[], aoSinal: (dados: string) => void): AbortController {
  const ctrl = new AbortController();
  const qs = canais.map((c) => `c=${encodeURIComponent(c)}`).join("&");
  void (async () => {
    try {
      const r = await fetch(`${URL_BASE}/api/sinais?${qs}`, { signal: ctrl.signal });
      if (!r.ok || !r.body) return void (erros.set("sinais", (erros.get("sinais") ?? 0) + 1));
      const leitor = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const bloco = buf.slice(0, i);
          buf = buf.slice(i + 2);
          const dados = bloco.split("\n").find((l) => l.startsWith("data: "));
          if (dados) aoSinal(dados.slice(6));
        }
      }
    } catch {
      // fim do teste
    }
  })();
  return ctrl;
}

async function main() {
  if (!SENHA) throw new Error("Informe --senha do gestor.");
  const login = await fetch(`${URL_BASE}/api/admin/entrar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Teste de carga", senha: SENHA }),
  });
  if (!login.ok) throw new Error(`Login do gestor falhou: ${login.status}`);
  const cookieAdmin = (login.headers.get("set-cookie") ?? "").split(";")[0];
  const admin = { cookie: cookieAdmin, "Content-Type": "application/json" };

  // Garante N mesas, todas com processo.
  let preparo = await (await fetch(`${URL_BASE}/api/admin/preparo`, { headers: admin })).json();
  const processoId = preparo.processos[0]?.id ?? null;
  for (let i = preparo.mesas.length; i < N_MESAS; i++) {
    await fetch(`${URL_BASE}/api/admin/preparo/mesa`, { method: "POST", headers: admin, body: JSON.stringify({ nome: "", processoId }) });
  }
  preparo = await (await fetch(`${URL_BASE}/api/admin/preparo`, { headers: admin })).json();
  for (const m of preparo.mesas.filter((x: { processoId: string | null }) => !x.processoId)) {
    await fetch(`${URL_BASE}/api/admin/preparo/mesa`, { method: "POST", headers: admin, body: JSON.stringify({ id: m.id, nome: m.nome, processoId }) });
  }
  const painel = await (await fetch(`${URL_BASE}/api/admin/painel`, { headers: admin })).json();
  const mesas: { id: string; codigo: string; faseAtual: number }[] = painel.mesas.slice(0, N_MESAS);
  const eventoId: string = painel.evento.id;

  // Todas na Fase 1, para os celulares poderem enviar contribuições.
  for (const m of mesas) {
    let fase = m.faseAtual;
    while (fase < 1) {
      await fetch(`${URL_BASE}/api/admin/mesas/${m.id}/forcar`, { method: "POST", headers: admin, body: "{}" });
      fase++;
    }
    while (fase > 1) {
      await fetch(`${URL_BASE}/api/admin/mesas/${m.id}/voltar`, { method: "POST", headers: admin, body: "{}" });
      fase--;
    }
  }
  console.log(`${mesas.length} mesas na Fase 1. Conectando ${N_CELULARES} celulares.`);

  const controles: AbortController[] = [];
  const ultimoSinal = new Map<string, number>();
  for (const m of mesas) controles.push(ouvir([`mesa:${m.id}`, `evento:${eventoId}`], () => ultimoSinal.set(m.id, performance.now())));
  controles.push(ouvir([`admin:${eventoId}`], () => {}));

  const tarefas: Promise<void>[] = [];
  // Celulares: entram, ouvem os sinais, buscam o estado e mandam contribuições.
  for (let i = 0; i < N_CELULARES; i++) {
    const m = mesas[i % mesas.length];
    tarefas.push(
      (async () => {
        await esperar(Math.random() * 3000);
        const r = await chamar("celular: entrar", `/api/p/${m.codigo}/entrar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: `Pessoa${i}` }),
        });
        const cookie = (r?.headers.get("set-cookie") ?? "").split(";")[0];
        controles.push(ouvir([`mesa:${m.id}`, `evento:${eventoId}`], () => {}));
        let proximaContribuicao = performance.now() + jitter(20000);
        while (ativo) {
          await chamar("celular: estado", `/api/p/${m.codigo}/estado`, { headers: { cookie } });
          if (performance.now() > proximaContribuicao) {
            await chamar("celular: contribuir", `/api/p/${m.codigo}/contribuir`, {
              method: "POST",
              headers: { cookie, "Content-Type": "application/json" },
              body: JSON.stringify({ texto: `Caso de teste de carga ${Math.random().toString(36).slice(2, 8)}` }),
            });
            proximaContribuicao = performance.now() + jitter(20000);
          }
          await esperar(jitter(5000));
        }
      })(),
    );
  }
  // Telas das mesas: buscam o estado com frequência maior que a real (15 s).
  for (const m of mesas) {
    tarefas.push(
      (async () => {
        while (ativo) {
          await chamar("mesa: estado", `/api/mesa/${m.codigo}/estado`);
          await esperar(jitter(3000));
        }
      })(),
    );
  }
  // Painel do admin.
  tarefas.push(
    (async () => {
      while (ativo) {
        await chamar("admin: painel", "/api/admin/painel", { headers: admin });
        await esperar(jitter(5000));
      }
    })(),
  );
  // Mudanças de fase: avança e volta uma mesa por vez e mede a chegada do sinal.
  tarefas.push(
    (async () => {
      let i = 0;
      await esperar(5000);
      while (ativo) {
        const m = mesas[i % mesas.length];
        const acao = Math.floor(i / mesas.length) % 2 === 0 ? "forcar" : "voltar";
        const antes = ultimoSinal.get(m.id) ?? 0;
        const t0 = performance.now();
        await chamar(`admin: ${acao}`, `/api/admin/mesas/${m.id}/${acao}`, { method: "POST", headers: admin, body: "{}" });
        while (performance.now() - t0 < 5000 && (ultimoSinal.get(m.id) ?? 0) <= antes) await esperar(10);
        const chegou = (ultimoSinal.get(m.id) ?? 0) > antes;
        if (chegou) propagacoes.push((ultimoSinal.get(m.id) ?? 0) - t0);
        else erros.set("sinal não chegou", (erros.get("sinal não chegou") ?? 0) + 1);
        i++;
        await esperar(2000);
      }
    })(),
  );

  await esperar(SEGUNDOS * 1000);
  ativo = false;
  await Promise.race([Promise.all(tarefas), esperar(10000)]);
  controles.forEach((c) => c.abort());

  console.log(`\nResultado: ${mesas.length} mesas, ${N_CELULARES} celulares, ${SEGUNDOS} s, ${controles.length} canais de tempo real abertos.\n`);
  const linhas = [...tempos.entries()].map(([rota, l]) => ({
    rota,
    pedidos: l.length,
    erros: erros.get(rota) ?? 0,
    "p50 ms": Math.round(percentil(l, 50)),
    "p95 ms": Math.round(percentil(l, 95)),
    "máx ms": Math.round(Math.max(...l)),
  }));
  console.table(linhas);
  console.log(
    `Mudança de fase até o sinal chegar à mesa: ${propagacoes.length} medições, p50 ${Math.round(percentil(propagacoes, 50))} ms, p95 ${Math.round(percentil(propagacoes, 95))} ms, máx ${Math.round(Math.max(0, ...propagacoes))} ms.`,
  );
  const outros = [...erros.entries()].filter(([k]) => !tempos.has(k));
  if (outros.length) console.log("Outros erros:", Object.fromEntries(outros));
  const totalErros = [...erros.values()].reduce((a, b) => a + b, 0);
  process.exitCode = totalErros > 0 || percentil(propagacoes, 95) > 2000 ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
