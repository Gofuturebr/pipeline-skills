import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BotaoImprimir } from "@/components/admin/BotaoImprimir";
import { obterSql } from "@/lib/servidor/db";
import { eventoAtual, mesasDoEvento } from "@/lib/servidor/consultas";
import { enderecoPublico } from "@/lib/servidor/endereco";
import { sessaoDaPagina } from "@/lib/servidor/sessao-pagina";
import { pode } from "@/lib/permissoes";

export const metadata: Metadata = { title: "Cartões das mesas" };

// Cartão de cada mesa para imprimir: nome, processo, código e QR para o celular.
// Dois cartões por folha A4. Só o gestor (preparação do evento).

export default async function PaginaCartoes() {
  const sessao = await sessaoDaPagina();
  if (!sessao) redirect("/admin/entrar");
  if (!pode(sessao.perfil, "preparo")) redirect("/admin");

  const sql = obterSql();
  const evento = await eventoAtual(sql);
  const mesas = evento ? await mesasDoEvento(sql, evento.id) : [];
  const endereco = enderecoPublico(await headers());

  return (
    <main className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 py-6 print:max-w-none print:p-0">
      <div className="flex flex-col gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="mr-auto font-titulo text-[28px] font-bold">Cartões das mesas</h1>
          <Link href="/admin" className="min-h-11 font-bold text-petroleo underline underline-offset-4">
            Voltar ao painel
          </Link>
          <BotaoImprimir />
        </div>
        <p className="text-[15px] leading-normal text-tinta-suave">
          Cada cartão leva o celular para <span className="font-mono text-tinta">{endereco}</span>. Antes de imprimir,
          leia um QR com o seu celular e confira se a tela da mesa abre. Se não abrir, o celular precisa estar na mesma
          rede Wi-Fi do computador que roda o sistema.
        </p>
      </div>

      {mesas.length === 0 ? <p>Nenhuma mesa cadastrada.</p> : null}

      <div className="flex flex-col gap-6 print:gap-0">
        {mesas.map((m) => (
          <article
            key={m.id}
            className="flex break-inside-avoid flex-col items-center gap-4 rounded-folha border-2 border-tinta bg-papel px-8 py-6 text-center print:h-[148mm] print:justify-center print:rounded-none print:border-0 print:border-b-2 print:border-dashed print:[&:nth-child(2n)]:break-after-page"
          >
            <h2 className="font-titulo text-[44px] font-bold leading-none">{m.nome}</h2>
            <p className="max-w-[40ch] text-xl leading-snug">{m.processo_nome ?? "Processo a definir"}</p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              <figure className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG gerado pelo servidor */}
                <img src={`/api/qr/${m.codigo}`} width={210} height={210} alt={`QR da ${m.nome}`} />
                <figcaption className="text-lg font-bold">No celular: aponte a câmera</figcaption>
              </figure>
              <div className="flex flex-col items-center gap-2">
                <span className="text-lg">No notebook, o código da mesa é</span>
                <span className="font-mono text-[44px] font-bold tracking-[0.2em]">{m.codigo}</span>
                <span className="text-base text-tinta-suave">
                  Abram <span className="font-mono">{endereco}</span> e digitem o código.
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
