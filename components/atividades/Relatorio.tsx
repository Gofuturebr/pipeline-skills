"use client";

import { useState } from "react";
import { Botao } from "@/components/base/Botao";
import { acharSensivel, mensagemSensivel } from "@/lib/sensivel";
import { Erro, Feito } from "./comum";
import { LinhaDoPlacar, PlacarDaRodada } from "./Placar";
import type { PropsAtividade } from "./tipos";

// Relatório do teste cruzado: enviar (mesa testadora), receber (mesa autora) e,
// na Fase 6, escolher a falha mais importante para consertar.

export function AtividadeRelatorio(props: PropsAtividade) {
  const modo = String(props.passo.config.modo ?? "receber");
  if (modo === "enviar") return <Enviar {...props} />;
  if (modo === "escolher") return <Escolher {...props} />;
  return <Receber {...props} />;
}

function Enviar({ estado, codigo, aoAgir, somenteLeitura }: PropsAtividade) {
  const teste = estado.teste;
  const [enviando, setEnviando] = useState(false);
  if (!teste?.rodada) return <p className="text-xl">Rodem o teste antes.</p>;
  const placar = teste.rodada.placar ?? [];
  const passaram = placar.filter((p) => p.passou).length;
  const parceira = teste.parceira?.nome ?? "mesa parceira";
  return (
    <div className="flex flex-col gap-5">
      <p className="font-titulo text-[32px] font-bold leading-tight">
        Relatório para a {parceira}: {passaram} de {placar.length} passaram
      </p>
      <ol className="flex flex-col gap-3">
        {placar
          .filter((p) => !p.passou)
          .map((p) => (
            <LinhaDoPlacar
              key={p.id}
              item={p}
              extra={<p className="text-lg"><span className="font-bold">O que aconteceu: </span>{p.observacao || "falta escrever"}</p>}
            />
          ))}
      </ol>
      {teste.enviado ? (
        <Feito>Relatório enviado para a {parceira}.</Feito>
      ) : somenteLeitura ? null : (
        <div>
          <Botao
            variante="secundario"
            tamanho="mesa"
            disabled={estado.mesa.estado === "pausada"}
            enviando={enviando}
            textoEnviando="Enviando"
            onClick={async () => {
              setEnviando(true);
              await aoAgir(`/api/mesa/${encodeURIComponent(codigo)}/teste/enviar`);
              setEnviando(false);
            }}
          >
            Enviar o relatório para a {parceira}
          </Botao>
        </div>
      )}
    </div>
  );
}

function Receber({ estado }: PropsAtividade) {
  const teste = estado.teste;
  if (!teste?.recebido?.rodada) {
    return (
      <p className="rounded-folha border-2 border-linha bg-bancada p-5 text-2xl">
        {teste?.testadaPor
          ? `A ${teste.testadaPor.nome} ainda está testando a skill de vocês. O relatório aparece aqui quando ela enviar.`
          : "O gestor ainda vai definir qual mesa testa a skill de vocês."}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-2xl font-bold">Relatório da {teste.recebido.testadora} sobre a skill de vocês</p>
      <PlacarDaRodada
        rodada={teste.recebido.rodada}
        extraDoItem={(item) =>
          item.passou || !item.observacao ? null : (
            <p className="text-lg">
              <span className="font-bold">O que aconteceu: </span>
              {item.observacao}
            </p>
          )
        }
      />
    </div>
  );
}

function Escolher({ estado, codigo, aoAgir, somenteLeitura }: PropsAtividade) {
  const rodada = estado.conserto?.rodadaAntes ?? estado.teste?.recebido?.rodada ?? null;
  const escolhida = estado.conserto?.aprovado ? null : estado.conserto?.resultadoConferenciaId ?? null;
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const base = `/api/mesa/${encodeURIComponent(codigo)}/conserto/falha`;
  const pausada = estado.mesa.estado === "pausada";
  if (!rodada) return <p className="text-xl">O relatório da mesa parceira ainda não chegou.</p>;
  const falhas = (rodada.placar ?? []).filter((p) => !p.passou);

  if (falhas.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-2xl font-bold">A mesa parceira não encontrou falhas. Escolham uma melhoria.</p>
        {estado.conserto?.oQueDeuErrado && !estado.conserto.aprovado ? <Feito>Escolhido: {estado.conserto.oQueDeuErrado}</Feito> : null}
        {erro ? <Erro texto={erro} /> : null}
        {somenteLeitura ? null : (
          <>
            <label className="flex flex-col gap-2 text-xl font-bold">
              O que querem melhorar na skill
              <textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} className="rounded-folha border-2 border-linha px-3 py-2 text-xl font-normal" />
            </label>
            <div>
              <Botao
                variante="secundario"
                tamanho="mesa"
                disabled={pausada || !texto.trim()}
                onClick={async () => {
                  const achado = acharSensivel(texto);
                  if (achado) return setErro(mensagemSensivel(achado));
                  setErro(null);
                  await aoAgir(base, { resultadoId: null, texto });
                }}
              >
                Escolher esta melhoria
              </Botao>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xl">Leiam as falhas em voz alta e escolham a que mais atrapalharia quem usa a skill.</p>
      <ol className="flex flex-col gap-3">
        {falhas.map((f) => (
          <LinhaDoPlacar
            key={f.id}
            item={f}
            extra={
              <div className="flex flex-col gap-3">
                {f.observacao ? (
                  <p className="text-lg">
                    <span className="font-bold">O que aconteceu: </span>
                    {f.observacao}
                  </p>
                ) : null}
                {escolhida === f.id ? (
                  <Feito>Esta é a falha escolhida</Feito>
                ) : somenteLeitura ? null : (
                  <div>
                    <Botao variante="secundario" disabled={pausada} onClick={() => void aoAgir(base, { resultadoId: f.id })}>
                      Escolher esta falha
                    </Botao>
                  </div>
                )}
              </div>
            }
          />
        ))}
      </ol>
    </div>
  );
}
