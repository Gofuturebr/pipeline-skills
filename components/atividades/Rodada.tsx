"use client";

import { Botao } from "@/components/base/Botao";
import { Markdown } from "@/components/base/Markdown";
import type { RodadaApi } from "@/lib/tipos-api";
import { CasoEResultado, Erro, TextoSendoEscrito, ultimaRodada, useEscritaDaIA } from "./comum";
import type { PropsAtividade } from "./tipos";

// Rodada (Fase 3): o Claude usa a pasta da skill para fazer a tarefa com o caso
// de exemplo. Na segunda rodada, mostra o que reusou da pasta e o que refez.

export function AtividadeRodada(props: PropsAtividade) {
  if (props.passo.config.tipoRodada === "conserto_depois") return <AntesEDepois {...props} />;
  return <RodadaDaCaixa {...props} />;
}

/** Fase 6: roda de novo com o caso novo e compara com o teste da parceira. */
function AntesEDepois(props: PropsAtividade) {
  const { estado, codigo, somenteLeitura } = props;
  const c = estado.conserto;
  const { escrevendo, erro, pedir } = useEscritaDaIA(props.aoSubstituir);
  if (!c?.aprovado) return <p className="text-xl">Aprovem o conserto no passo anterior.</p>;
  const antes = c.rodadaAntes?.placar ?? [];
  const depois = c.rodadaDepois?.placar ?? [];
  const pausada = estado.mesa.estado === "pausada";
  const conta = (l: typeof antes) => `${l.filter((x) => x.passou).length} de ${l.length}`;
  const linhas = [...new Set([...antes, ...depois].map((x) => x.descricao))];
  return (
    <div className="flex flex-col gap-6">
      {erro ? <Erro texto={erro} /> : null}
      {escrevendo !== null ? <TextoSendoEscrito texto={escrevendo} rotulo="A IA está usando a skill consertada" /> : null}
      {c.rodadaDepois && escrevendo === null ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <p className="rounded-folha border-2 border-linha bg-bancada p-5 font-titulo text-[32px] font-bold">Antes: {conta(antes)}</p>
            <p className="rounded-folha border-2 border-estado-pronta bg-papel p-5 font-titulo text-[32px] font-bold">Depois: {conta(depois)}</p>
          </div>
          <table className="w-full border-collapse text-left text-xl">
            <thead>
              <tr className="border-b-2 border-linha">
                <th className="py-2 pr-4">Conferência</th>
                <th className="py-2 pr-4">Antes</th>
                <th className="py-2">Depois</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((d) => {
                const a = antes.find((x) => x.descricao === d);
                const b = depois.find((x) => x.descricao === d);
                const marca = (x: typeof a) => (!x ? "nova" : x.passou ? "Passou" : x.conseguiuConferir ? "Falhou" : "Não deu para conferir");
                return (
                  <tr key={d} className="border-b border-linha">
                    <td className="py-2 pr-4">{d}</td>
                    <td className="py-2 pr-4 font-bold">{marca(a)}</td>
                    <td className="py-2 font-bold">{marca(b)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : null}
      {escrevendo === null && !somenteLeitura ? (
        <div>
          <Botao
            variante="secundario"
            tamanho="mesa"
            disabled={pausada}
            onClick={() => void pedir(`/api/mesa/${encodeURIComponent(codigo)}/conserto/rodar`)}
          >
            {c.rodadaDepois ? "Rodar de novo" : "Rodar a tarefa com a skill consertada"}
          </Botao>
        </div>
      ) : null}
    </div>
  );
}

function RodadaDaCaixa(props: PropsAtividade) {
  const { estado, codigo, passo, somenteLeitura } = props;
  const tipo = String(passo.config.tipoRodada ?? "exemplo") as "exemplo" | "segunda";
  const rodada = ultimaRodada(estado, tipo);
  const { escrevendo, erro, pedir } = useEscritaDaIA(props.aoSubstituir);
  const pausada = estado.mesa.estado === "pausada";
  const caso = rodada?.entrada ?? estado.processoDetalhe?.casoExemplo ?? "";

  if (somenteLeitura) return rodada ? <ResultadoDaRodada rodada={rodada} /> : <p className="text-xl text-tinta-suave">Rodada não feita.</p>;

  return (
    <div className="flex flex-col gap-6">
      {erro ? <Erro texto={erro} /> : null}
      {escrevendo !== null ? (
        <CasoEResultado entrada={caso} saida={<TextoSendoEscrito texto={escrevendo} rotulo="A IA está fazendo a tarefa" />} />
      ) : rodada ? (
        <ResultadoDaRodada rodada={rodada} />
      ) : (
        <CasoEResultado
          entrada={caso || "O caso de exemplo do kit."}
          saida={<p className="text-xl text-tinta-suave">O resultado aparece aqui, enquanto a IA escreve.</p>}
        />
      )}
      {escrevendo === null ? (
        <div className="flex flex-wrap items-center gap-4">
          <Botao
            variante="secundario"
            tamanho="mesa"
            disabled={pausada}
            motivo={pausada ? "A mesa está pausada" : null}
            onClick={() => void pedir(`/api/mesa/${encodeURIComponent(codigo)}/rodada`, { tipo })}
          >
            {rodada ? "Rodar de novo" : tipo === "segunda" ? "Rodar a tarefa do zero" : "Rodar a tarefa"}
          </Botao>
          {rodada && tipo === "exemplo" ? (
            <span className="text-lg text-tinta-suave">No próximo passo, o Guardião congela as partes boas.</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ResultadoDaRodada({ rodada }: { rodada: RodadaApi }) {
  return (
    <div className="flex flex-col gap-5">
      <CasoEResultado entrada={rodada.entrada} saida={<Markdown texto={rodada.saida} />} />
      {rodada.tipo === "segunda" ? (
        <div className="grid gap-4 min-[1180px]:grid-cols-2">
          <section className="flex flex-col gap-2 rounded-folha border-2 border-estado-pronta bg-papel p-5">
            <h3 className="font-titulo text-[24px] font-semibold">A IA reusou da pasta</h3>
            {rodada.reusou.length ? (
              <ul className="flex flex-col gap-2 text-xl">
                {rodada.reusou.map((r) => (
                  <li key={r.arquivo}>
                    <span className="font-mono">{r.arquivo}</span>: {r.para_que}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xl text-tinta-suave">Nada. A pasta ainda não tem o que reusar.</p>
            )}
          </section>
          <section className="flex flex-col gap-2 rounded-folha border-2 border-estado-atrasada bg-papel p-5">
            <h3 className="font-titulo text-[24px] font-semibold">A IA refez do zero</h3>
            {rodada.refez.length ? (
              <ul className="flex list-disc flex-col gap-2 pl-6 text-xl">
                {rodada.refez.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xl text-tinta-suave">Nada: tudo veio da pasta.</p>
            )}
            {rodada.refez.length ? (
              <p className="text-lg text-tinta-suave">O que foi refeito é candidato a virar modelo na caixa.</p>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
