"use client";

import { useEffect, useState } from "react";

/** Hora atual pelo relógio do servidor, atualizada a cada segundo. */
export function useAgora(defasagem: number): number {
  const [agora, setAgora] = useState(() => Date.now() + defasagem);
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now() + defasagem), 1000);
    return () => clearInterval(t);
  }, [defasagem]);
  return agora;
}
