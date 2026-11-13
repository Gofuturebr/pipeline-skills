import { EventEmitter } from "node:events";
import { EVENTO_SINAL, type Sinal } from "@/lib/sinais";

// Envio de sinais de tempo real.
// Com Supabase configurado: Broadcast do Supabase Realtime, pela rota REST.
// Sem Supabase: emissor em memória, entregue ao navegador por SSE em /api/sinais.
// O modo local só funciona com um único processo de servidor (desenvolvimento,
// testes ou um servidor único). Ver docs/decisoes.md.

const global = globalThis as unknown as { __mesaEmissor?: EventEmitter };

export function emissorLocal(): EventEmitter {
  if (!global.__mesaEmissor) {
    global.__mesaEmissor = new EventEmitter();
    global.__mesaEmissor.setMaxListeners(0);
  }
  return global.__mesaEmissor;
}

export function usaSupabaseRealtime(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function emitir(canais: string[], sinal: Sinal): Promise<void> {
  if (canais.length === 0) return;
  if (!usaSupabaseRealtime()) {
    const emissor = emissorLocal();
    for (const canal of canais) emissor.emit(canal, sinal);
    return;
  }
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  try {
    const resposta = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: chave,
        Authorization: `Bearer ${chave}`,
      },
      body: JSON.stringify({
        messages: canais.map((topic) => ({ topic, event: EVENTO_SINAL, payload: sinal })),
      }),
      signal: AbortSignal.timeout(1500),
    });
    if (!resposta.ok) console.error("Falha ao enviar sinal de tempo real", resposta.status);
  } catch (erro) {
    // O sinal é só um atalho: as telas também buscam o estado a cada 15 segundos.
    console.error("Falha ao enviar sinal de tempo real", erro);
  }
}
