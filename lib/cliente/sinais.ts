"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { EVENTO_SINAL, type Sinal } from "@/lib/sinais";

export type EstadoConexao = "conectado" | "reconectando" | "sem_conexao";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type ClienteSupabase = import("@supabase/supabase-js").SupabaseClient;
let clienteSupabase: Promise<ClienteSupabase> | null = null;

function obterSupabase(): Promise<ClienteSupabase> {
  if (!clienteSupabase) {
    clienteSupabase = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(SUPABASE_URL as string, SUPABASE_ANON as string, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    );
  }
  return clienteSupabase;
}

function assinarOnline(aviso: () => void): () => void {
  window.addEventListener("online", aviso);
  window.addEventListener("offline", aviso);
  return () => {
    window.removeEventListener("online", aviso);
    window.removeEventListener("offline", aviso);
  };
}

/**
 * Assina canais de tempo real e chama `aoReceber` a cada sinal. Ao reconectar,
 * chama `aoReceber({ tipo: "reconectado" })` para a tela buscar o estado atual.
 */
export function useSinais(canais: string[], aoReceber: (s: Sinal) => void): EstadoConexao {
  const [estado, setEstado] = useState<EstadoConexao>("reconectando");
  const online = useSyncExternalStore(assinarOnline, () => navigator.onLine, () => true);
  const callback = useRef(aoReceber);
  useEffect(() => {
    callback.current = aoReceber;
  });
  const chave = canais.filter(Boolean).sort().join(",");

  useEffect(() => {
    if (!chave) return;
    const lista = chave.split(",");
    let jaConectou = false;
    const aoConectar = () => {
      setEstado("conectado");
      if (jaConectou) callback.current({ tipo: "reconectado" });
      jaConectou = true;
    };

    if (SUPABASE_URL && SUPABASE_ANON) {
      let ativo = true;
      const canaisAbertos: { unsubscribe: () => unknown }[] = [];
      let prontos = 0;
      obterSupabase().then((supabase) => {
        if (!ativo) return;
        for (const nome of lista) {
          const canal = supabase
            .channel(nome)
            .on("broadcast", { event: EVENTO_SINAL }, ({ payload }) => callback.current(payload as Sinal))
            .subscribe((status) => {
              if (status === "SUBSCRIBED") {
                prontos++;
                if (prontos >= lista.length) aoConectar();
              } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
                prontos = Math.max(0, prontos - 1);
                setEstado("reconectando");
              }
            });
          canaisAbertos.push(canal);
        }
      });
      return () => {
        ativo = false;
        canaisAbertos.forEach((c) => c.unsubscribe());
      };
    }

    // Canal local por SSE (sem Supabase configurado).
    const params = new URLSearchParams();
    lista.forEach((c) => params.append("c", c));
    const fonte = new EventSource(`/api/sinais?${params}`);
    fonte.addEventListener("pronto", aoConectar);
    fonte.addEventListener("sinal", (e) => {
      try {
        callback.current(JSON.parse((e as MessageEvent).data) as Sinal);
      } catch {}
    });
    fonte.onerror = () => setEstado("reconectando");
    return () => fonte.close();
  }, [chave]);

  return online ? estado : "sem_conexao";
}
