"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/base/Botao";
import { Campo } from "@/components/base/Campo";

export function EntradaMesa() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const limpo = codigo.replace(/[\s-]/g, "").toUpperCase();
    if (!limpo) {
      setErro("Digitem o código da mesa.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/mesa/${encodeURIComponent(limpo)}/estado`, { cache: "no-store" });
      if (r.status === 404) {
        setErro("Não encontramos esta mesa. Confira o código no cartão da mesa.");
        return;
      }
      if (!r.ok) {
        const corpo = await r.json().catch(() => null);
        setErro(corpo?.erro ?? "Algo deu errado. Tentem de novo.");
        return;
      }
      router.push(`/mesa/${limpo}`);
    } catch {
      setErro("Sem conexão. Tentem de novo em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={entrar} className="flex flex-col gap-4">
      <Campo
        rotulo="Código da mesa"
        tamanho="mesa"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        erro={erro}
        className="[&_input]:font-mono [&_input]:tracking-widest"
      />
      <Botao type="submit" variante="principal" tamanho="mesa" enviando={enviando} textoEnviando="Entrando">
        Entrar na mesa
      </Botao>
    </form>
  );
}
