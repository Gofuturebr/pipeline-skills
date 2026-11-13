"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/base/Botao";
import { Campo } from "@/components/base/Campo";
import { enviar } from "@/lib/cliente/estado-remoto";

export function EntradaAdmin() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !senha) {
      setErro("Informe seu nome e a senha.");
      return;
    }
    setEnviando(true);
    const r = await enviar("/api/admin/entrar", { nome: nome.trim(), senha });
    setEnviando(false);
    if (!r.ok) {
      setErro(r.mensagem);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={entrar} className="flex flex-col gap-4">
      <Campo
        rotulo="Seu nome"
        ajuda="Aparece no registro das ações que você fizer."
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        autoComplete="name"
        maxLength={40}
      />
      <Campo
        rotulo="Senha"
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        autoComplete="current-password"
        erro={erro}
      />
      <Botao type="submit" variante="principal" enviando={enviando} textoEnviando="Entrando">
        Entrar
      </Botao>
    </form>
  );
}
