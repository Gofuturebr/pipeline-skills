// Resposta em fluxo para o navegador: uma linha JSON por evento. Usada quando a
// IA escreve aos poucos (seção 8: texto aparecendo aos poucos).

export type EventoFluxo =
  | { t: "texto"; d: string }
  | { t: "fim"; dados?: unknown }
  | { t: "erro"; mensagem: string; dados?: unknown };

export function respostaEmFluxo(executar: (enviar: (e: EventoFluxo) => void) => Promise<void>): Response {
  const codificador = new TextEncoder();
  const corpo = new ReadableStream<Uint8Array>({
    async start(controle) {
      const enviar = (e: EventoFluxo) => {
        try {
          controle.enqueue(codificador.encode(`${JSON.stringify(e)}\n`));
        } catch {
          // O navegador fechou a conexão. O servidor termina o trabalho mesmo assim.
        }
      };
      try {
        await executar(enviar);
      } catch (e) {
        console.error(e);
        enviar({ t: "erro", mensagem: "A resposta não chegou. O que vocês escreveram está salvo." });
      } finally {
        try {
          controle.close();
        } catch {
          // já fechado
        }
      }
    },
  });
  return new Response(corpo, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
