// Lê uma resposta em fluxo (uma linha JSON por evento) vinda do servidor.

export type EventoFluxoCliente<T> =
  | { t: "texto"; d: string }
  | { t: "fim"; dados?: T }
  | { t: "erro"; mensagem: string; dados?: T };

export async function lerFluxo<T>(
  url: string,
  corpo: unknown,
  aoTexto: (acumulado: string) => void,
): Promise<{ ok: true; dados?: T } | { ok: false; mensagem: string; dados?: T }> {
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo ?? {}),
    });
  } catch {
    return { ok: false, mensagem: "Sem conexão. O que vocês escreveram está salvo. Tentem de novo." };
  }
  if (!resposta.ok || !resposta.body) {
    const json = await resposta.json().catch(() => null);
    return { ok: false, mensagem: json?.erro ?? "A resposta não chegou. O que vocês escreveram está salvo." };
  }
  const leitor = resposta.body.getReader();
  const decodificador = new TextDecoder();
  let pendente = "";
  let acumulado = "";
  let final: { ok: true; dados?: T } | { ok: false; mensagem: string; dados?: T } | null = null;
  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      pendente += decodificador.decode(value, { stream: true });
      let quebra: number;
      while ((quebra = pendente.indexOf("\n")) >= 0) {
        const linha = pendente.slice(0, quebra).trim();
        pendente = pendente.slice(quebra + 1);
        if (!linha) continue;
        const e = JSON.parse(linha) as EventoFluxoCliente<T>;
        if (e.t === "texto") {
          acumulado += e.d;
          aoTexto(acumulado);
        } else if (e.t === "fim") final = { ok: true, dados: e.dados };
        else final = { ok: false, mensagem: e.mensagem, dados: e.dados };
      }
    }
  } catch {
    return { ok: false, mensagem: "A conexão caiu no meio da resposta. O que vocês escreveram está salvo." };
  }
  return final ?? { ok: false, mensagem: "A resposta não chegou. O que vocês escreveram está salvo." };
}
