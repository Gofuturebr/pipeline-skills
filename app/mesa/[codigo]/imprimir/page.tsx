import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BotaoImprimir } from "@/components/admin/BotaoImprimir";
import { obterSql } from "@/lib/servidor/db";
import { mesaPorCodigo, roteiroDoEvento } from "@/lib/servidor/consultas";
import { processoDaMesa } from "@/lib/servidor/processo";
import { enderecoDoParticipante } from "@/lib/servidor/endereco";
import { DEFINICAO_PAPEIS, TEMAS_ENTREVISTA, nomeDoPapel } from "@/lib/jornada";
import { CAMPOS_FICHA, lerFicha } from "@/lib/processo";
import { SECOES_SKILL } from "@/lib/ia/prompts/skill";

export const metadata: Metadata = { title: "Roteiro da mesa para imprimir" };

// Plano B (seção 8): o roteiro completo da mesa numa folha A4, para seguir no
// papel se a internet cair. Traz fases, passos, papéis, ficha, kit, temas da
// entrevista e espaço para escrever a skill e as conferências.

const PERGUNTAS_GUIA: Record<string, string> = {
  gatilho: "O que faz a tarefa começar? Quantas vezes por dia ou semana acontece?",
  entradas: "O que vocês precisam ter em mãos antes de começar?",
  passos: "Contem o último caso do começo ao fim, na ordem real.",
  decisoes: "Em que momento vocês decidem algo? Se acontecer isso, fazem o quê?",
  conferir: "O que vocês olham antes de dar a tarefa por pronta?",
  erros: "Qual foi a última vez que deu errado? O que aconteceu?",
  tom: "Como o resultado começa e termina? Que tom vocês usam?",
  versao_ruim: "Como é uma versão ruim? O que denuncia que está ruim?",
};

function Linhas({ n }: { n: number }) {
  return (
    <div aria-hidden className="flex flex-col">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="h-8 border-b border-linha" />
      ))}
    </div>
  );
}

export default async function PaginaImprimir({ params }: PageProps<"/mesa/[codigo]/imprimir">) {
  const sql = obterSql();
  const mesa = await mesaPorCodigo(sql, (await params).codigo);
  if (!mesa) notFound();
  const [roteiro, processo] = await Promise.all([roteiroDoEvento(sql, mesa.evento_id), processoDaMesa(sql, mesa)]);
  const ficha = lerFicha(processo?.ficha);
  const endereco = enderecoDoParticipante(await headers(), mesa.codigo);

  return (
    <main className="mx-auto flex max-w-[820px] flex-col gap-8 bg-papel px-6 py-6 text-[15px] leading-normal print:max-w-none print:px-0 print:py-0">
      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <p className="mr-auto text-tinta-suave">Folha A4. Use se a internet cair: o grupo segue o roteiro no papel.</p>
        <BotaoImprimir texto="Imprimir o roteiro" />
      </div>

      <section className="flex items-start justify-between gap-6 border-b-2 border-tinta pb-4">
        <div>
          <h1 className="font-titulo text-[32px] font-bold leading-tight">{mesa.nome}: roteiro da mesa</h1>
          <p className="text-[17px]">{processo?.nome ?? "Processo a definir"}</p>
          <p className="mt-1">
            Código da mesa: <span className="font-mono font-bold">{mesa.codigo}</span>
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG gerado pelo servidor */}
        <img src={`/api/qr/${mesa.codigo}`} width={110} height={110} alt="QR da mesa" />
      </section>
      <p className="-mt-4 text-[13px] text-tinta-suave">Celulares: {endereco}</p>

      <section className="flex flex-col gap-2">
        <h2 className="font-titulo text-[22px] font-bold">Papéis</h2>
        <table className="w-full border-collapse">
          <tbody>
            {DEFINICAO_PAPEIS.map((p) => (
              <tr key={p.papel} className="border-b border-linha">
                <td className="w-40 py-2 pr-3 align-top font-bold">{p.nome}</td>
                <td className="py-2 pr-3 align-top">{p.descricao}</td>
                <td className="w-44 py-2 align-bottom">
                  <div className="h-6 border-b border-tinta" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-titulo text-[22px] font-bold">Ficha do processo</h2>
        <dl className="grid gap-2">
          {CAMPOS_FICHA.map((c) =>
            ficha[c.chave] ? (
              <div key={c.chave}>
                <dt className="font-bold">{c.rotulo}</dt>
                <dd>{ficha[c.chave]}</dd>
              </div>
            ) : null,
          )}
        </dl>
        {processo?.kit_materiais ? (
          <>
            <h3 className="mt-2 font-bold">Materiais do kit</h3>
            <p className="whitespace-pre-wrap">{processo.kit_materiais}</p>
          </>
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold">Exemplo bom</h3>
            <p className="whitespace-pre-wrap">{processo?.exemplo_bom}</p>
          </div>
          <div>
            <h3 className="font-bold">Exemplo ruim</h3>
            <p className="whitespace-pre-wrap">{processo?.exemplo_ruim}</p>
          </div>
        </div>
        <h3 className="mt-2 font-bold">Tarefa em uma linha</h3>
        <Linhas n={2} />
      </section>

      {roteiro.fases.map((f) => (
        <section key={f.id} className="flex break-inside-avoid flex-col gap-2">
          <h2 className="font-titulo text-[22px] font-bold">
            Fase {f.ordem}: {f.nome} ({f.duracao_min} min)
          </h2>
          <p>
            <span className="font-bold">Entrega:</span> {f.entrega}. <span className="font-bold">Pronto quando:</span> {f.criterio_texto}.
          </p>
          <ol className="flex flex-col gap-1">
            {(roteiro.passosPorFase.get(f.ordem) ?? []).map((p) => (
              <li key={p.id} className="flex gap-2">
                <span className="w-5 shrink-0 font-mono">☐</span>
                <span>
                  {p.instrucao} <span className="text-tinta-suave">({nomeDoPapel(p.papel)})</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section className="flex break-before-page flex-col gap-3">
        <h2 className="font-titulo text-[22px] font-bold">Entrevista sem a IA: perguntas guia dos 8 temas</h2>
        <p>Uma pessoa faz as perguntas, uma por vez. O Piloto anota as respostas.</p>
        {TEMAS_ENTREVISTA.map((t) => (
          <div key={t.chave} className="break-inside-avoid">
            <p>
              <span className="font-bold">{t.nome}:</span> {PERGUNTAS_GUIA[t.chave]}
            </p>
            <Linhas n={3} />
          </div>
        ))}
      </section>

      <section className="flex break-before-page flex-col gap-3">
        <h2 className="font-titulo text-[22px] font-bold">Rascunho do SKILL.md</h2>
        {SECOES_SKILL.map((s) => (
          <div key={s} className="break-inside-avoid">
            <p className="font-bold">{s}</p>
            <Linhas n={s === "Passos" ? 6 : 3} />
          </div>
        ))}
      </section>

      <section className="flex break-inside-avoid flex-col gap-2">
        <h2 className="font-titulo text-[22px] font-bold">Conferências da prova (de 5 a 10)</h2>
        <p>Cada uma diz o que confere e contra qual fonte. Nada de “claro”, “profissional” ou “de qualidade”.</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-tinta text-left">
              <th className="w-8 py-1">Nº</th>
              <th className="py-1">O que confere</th>
              <th className="w-56 py-1">Contra qual fonte</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }, (_, i) => (
              <tr key={i} className="h-9 border-b border-linha">
                <td>{i + 1}</td>
                <td />
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
