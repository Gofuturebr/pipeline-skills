import type { NextRequest } from "next/server";
import { emissorLocal, usaSupabaseRealtime } from "@/lib/servidor/sinais";
import { canalValido, type Sinal } from "@/lib/sinais";
import { erro } from "@/lib/servidor/http";

// Canal local de tempo real por SSE. Só é usado quando o Supabase Realtime não
// está configurado. Ver lib/servidor/sinais.ts.

export async function GET(req: NextRequest) {
  if (usaSupabaseRealtime()) return erro("Use o Supabase Realtime.", 404);
  const canais = req.nextUrl.searchParams.getAll("c").filter(canalValido).slice(0, 5);
  if (canais.length === 0) return erro("Informe ao menos um canal.");

  const emissor = emissorLocal();
  const codificador = new TextEncoder();
  let limpar = () => {};

  const fluxo = new ReadableStream<Uint8Array>({
    start(controle) {
      const enviar = (texto: string) => {
        try {
          controle.enqueue(codificador.encode(texto));
        } catch {
          limpar();
        }
      };
      const ouvintes = canais.map((canal) => {
        const fn = (sinal: Sinal) => enviar(`event: sinal\ndata: ${JSON.stringify(sinal)}\n\n`);
        emissor.on(canal, fn);
        return () => emissor.off(canal, fn);
      });
      const batida = setInterval(() => enviar(`: ativo\n\n`), 15000);
      limpar = () => {
        clearInterval(batida);
        ouvintes.forEach((desligar) => desligar());
      };
      req.signal.addEventListener("abort", () => {
        limpar();
        try {
          controle.close();
        } catch {}
      });
      enviar(`retry: 2000\nevent: pronto\ndata: {}\n\n`);
    },
    cancel() {
      limpar();
    },
  });

  return new Response(fluxo, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
