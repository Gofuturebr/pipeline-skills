"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSinais, type EstadoConexao } from "./sinais";
import type { Sinal } from "@/lib/sinais";

/** Intervalo de busca de reserva, caso algum sinal de tempo real se perca. */
const INTERVALO_RESERVA_MS = 15000;

export interface EstadoRemoto<T> {
  dados: T | null;
  erro: { mensagem: string; status: number } | null;
  conexao: EstadoConexao;
  /** Diferença entre o relógio do servidor e o do navegador, em ms. */
  defasagem: number;
  recarregar: () => void;
  /** Troca os dados pela resposta de uma ação (que já devolve o estado novo). */
  substituir: (novos: T) => void;
  /** Altera uma parte dos dados, sem buscar tudo de novo. */
  modificar: (fn: (atual: T) => T) => void;
}

/**
 * Busca um estado no servidor e o mantém atualizado: busca de novo a cada
 * sinal de tempo real, ao reconectar, ao voltar para a aba e a cada 15 s.
 */
export function useEstadoRemoto<T extends { agora?: string }>(
  url: string | null,
  canais: (dados: T | null) => string[],
  opcoes: { aoSinal?: (s: Sinal, recarregar: () => void) => boolean } = {},
): EstadoRemoto<T> {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<EstadoRemoto<T>["erro"]>(null);
  const [falhouRede, setFalhouRede] = useState(false);
  const [defasagem, setDefasagem] = useState(0);
  const emVoo = useRef(false);
  const deNovo = useRef(false);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aplicar = useCallback((novos: T) => {
    setDados(novos);
    if (novos.agora) setDefasagem(Date.parse(novos.agora) - Date.now());
  }, []);

  const modificar = useCallback((fn: (atual: T) => T) => {
    setDados((d) => (d ? fn(d) : d));
  }, []);

  const buscar = useCallback(async () => {
    if (!url) return;
    if (emVoo.current) {
      deNovo.current = true;
      return;
    }
    emVoo.current = true;
    try {
      // Se chegou outro sinal durante a busca, busca mais uma vez no fim.
      do {
        deNovo.current = false;
        try {
          const resposta = await fetch(url, { cache: "no-store" });
          const corpo = await resposta.json().catch(() => null);
          if (!resposta.ok) {
            setErro({ mensagem: corpo?.erro ?? "Algo deu errado.", status: resposta.status });
          } else {
            setErro(null);
            aplicar(corpo as T);
          }
          setFalhouRede(false);
        } catch {
          setFalhouRede(true);
        }
      } while (deNovo.current);
    } finally {
      emVoo.current = false;
    }
  }, [url, aplicar]);

  const recarregar = useCallback(() => {
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => void buscar(), 80);
  }, [buscar]);

  useEffect(() => {
    void buscar();
    const intervalo = setInterval(() => void buscar(), INTERVALO_RESERVA_MS);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void buscar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("online", aoVoltar);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("online", aoVoltar);
    };
  }, [buscar]);

  const aoSinal = opcoes.aoSinal;
  const conexao = useSinais(canais(dados), (s) => {
    if (aoSinal && aoSinal(s, recarregar)) return;
    recarregar();
  });

  return {
    dados,
    erro,
    conexao: falhouRede ? "sem_conexao" : conexao,
    defasagem,
    recarregar,
    substituir: aplicar,
    modificar,
  };
}

/** Faz uma chamada POST/PUT e devolve o corpo ou a mensagem de erro. */
export async function enviar<T = unknown>(
  url: string,
  corpo?: unknown,
  metodo: "POST" | "PUT" = "POST",
): Promise<{ ok: true; dados: T } | { ok: false; mensagem: string }> {
  try {
    const resposta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const json = await resposta.json().catch(() => null);
    if (!resposta.ok) return { ok: false, mensagem: json?.erro ?? "Algo deu errado. Tentem de novo." };
    return { ok: true, dados: json as T };
  } catch {
    return { ok: false, mensagem: "Sem conexão. Tentem de novo em instantes." };
  }
}
