"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Botao } from "@/components/base/Botao";
import { Icone } from "@/components/base/Icone";
import { lerFluxo } from "@/lib/cliente/fluxo";
import { guardarRascunho, lerRascunho } from "@/lib/cliente/rascunho";
import { TEMAS_ENTREVISTA } from "@/lib/jornada";
import { acharSensivel, mensagemSensivel } from "@/lib/sensivel";
import type { EstadoMesaApi } from "@/lib/tipos-api";
import { FilaDeContribuicoes } from "./FilaDeContribuicoes";
import type { PropsAtividade } from "./tipos";

// Fase 2: a IA pergunta, uma pergunta por vez, e a mesa responde. A pergunta é o
// maior elemento da tela. Barra dos 8 temas, perguntas respondidas e a fila do
// que chega dos celulares, com "Incluir na resposta".

type Reconhecimento = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function criarReconhecimento(): Reconhecimento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Reconhecimento; webkitSpeechRecognition?: new () => Reconhecimento };
  const Classe = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Classe ? new Classe() : null;
}

const semAssinatura = () => () => {};

export function AtividadeEntrevista(props: PropsAtividade) {
  const { estado, somenteLeitura } = props;
  if (!estado.entrevista) return null;
  if (somenteLeitura) return <ListaDeRespondidas estado={estado} aberta />;
  return <EntrevistaAtiva {...props} />;
}

function BarraDeTemas({ cobertos }: { cobertos: string[] }) {
  const faltam = TEMAS_ENTREVISTA.filter((t) => !cobertos.includes(t.chave));
  return (
    <div className="flex flex-col gap-2">
      <ol className="grid grid-cols-4 gap-1.5" aria-label="Temas cobertos">
        {TEMAS_ENTREVISTA.map((t) => {
          const ok = cobertos.includes(t.chave);
          return (
            <li
              key={t.chave}
              title={ok ? `${t.nome}: coberto` : `${t.nome}: falta cobrir`}
              className={`flex min-h-11 items-center gap-1.5 rounded-folha border-2 px-2 text-[15px] font-bold leading-tight ${
                ok ? "border-petroleo bg-petroleo text-papel" : "border-linha bg-papel text-tinta-suave"
              }`}
            >
              {ok ? <Icone nome="visto" className="h-4 w-4 shrink-0" /> : null}
              <span>{t.nome}</span>
            </li>
          );
        })}
      </ol>
      <p className="text-base text-tinta-suave">
        {faltam.length === 0
          ? "Os 8 temas estão cobertos."
          : `Temas cobertos: ${8 - faltam.length} de 8. Falta: ${faltam.map((t) => t.nome.toLowerCase()).join(", ")}.`}
      </p>
    </div>
  );
}

function ListaDeRespondidas({ estado, aberta = false }: { estado: EstadoMesaApi; aberta?: boolean }) {
  const respondidas = estado.entrevista?.perguntas.filter((p) => p.resposta !== null) ?? [];
  const [ver, setVer] = useState(aberta);
  if (respondidas.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={ver}
        onClick={() => setVer((v) => !v)}
        className="min-h-11 self-start text-lg font-bold text-petroleo underline underline-offset-4"
      >
        {ver ? "Esconder as perguntas respondidas" : `Perguntas respondidas (${respondidas.length})`}
      </button>
      {ver ? (
        <ol className="flex flex-col gap-3">
          {respondidas.map((p, i) => (
            <li key={p.id} className="rounded-folha border-2 border-linha bg-papel p-4">
              <p className="text-base text-tinta-suave">
                Pergunta {i + 1}
                {p.temaNome ? `, ${p.temaNome}` : ""}
              </p>
              <p className="mt-1 text-xl font-bold leading-snug">{p.texto}</p>
              <p className="mt-2 whitespace-pre-wrap text-lg leading-normal">{p.resposta}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function EntrevistaAtiva({ estado, codigo, aoAgir, aoSubstituir }: PropsAtividade) {
  const e = estado.entrevista!;
  const base = `/api/mesa/${encodeURIComponent(codigo)}`;
  const pendente = e.perguntas.length > 0 && e.perguntas[e.perguntas.length - 1].resposta === null
    ? e.perguntas[e.perguntas.length - 1]
    : null;
  const chaveRascunho = `mesa:${codigo}:rascunho:resposta:${pendente?.id ?? "nenhuma"}`;

  const [resposta, setResposta] = useState(() => lerRascunho(chaveRascunho) ?? "");
  const [rascunhoDe, setRascunhoDe] = useState(chaveRascunho);
  const [escrevendo, setEscrevendo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [ditando, setDitando] = useState(false);
  const reconhecimento = useRef<Reconhecimento | null>(null);
  const pediuInicio = useRef(false);
  const secaoPergunta = useRef<HTMLElement>(null);
  const temDitado = useSyncExternalStore(semAssinatura, () => criarReconhecimento() !== null, () => false);
  const pausada = estado.mesa.estado === "pausada";

  // Pergunta nova: o campo passa a ser o rascunho dela.
  if (rascunhoDe !== chaveRascunho) {
    setRascunhoDe(chaveRascunho);
    setResposta(lerRascunho(chaveRascunho) ?? "");
  }

  async function turno(texto?: string) {
    setEnviando(true);
    setErro(null);
    setEscrevendo("");
    const r = await lerFluxo<EstadoMesaApi>(`${base}/entrevista/turno`, texto ? { resposta: texto } : {}, (acc) =>
      setEscrevendo(acc),
    );
    setEnviando(false);
    setEscrevendo(null);
    if (r.dados) aoSubstituir(r.dados);
    if (!r.ok) setErro(r.mensagem);
    else if (texto) {
      guardarRascunho(chaveRascunho, "");
      setResposta("");
    }
  }

  // Pergunta nova: a folha rola até ela, para a mesa ler do começo.
  const idPendente = pendente?.id;
  useEffect(() => {
    if (idPendente) secaoPergunta.current?.scrollIntoView({ block: "start" });
  }, [idPendente]);

  // Ao abrir a entrevista sem nenhuma pergunta, a IA faz a primeira.
  useEffect(() => {
    if (pediuInicio.current || e.perguntas.length > 0 || e.ocupada || e.encerrada || pausada) return;
    pediuInicio.current = true;
    void turno();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao abrir
  }, []);

  function ditar() {
    if (ditando) {
      reconhecimento.current?.stop();
      return;
    }
    const r = criarReconhecimento();
    if (!r) return;
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = false;
    const inicio = resposta;
    let ditado = "";
    r.onresult = (ev) => {
      ditado = Array.from(ev.results)
        .filter((x) => x.isFinal)
        .map((x) => x[0].transcript)
        .join(" ");
      const novo = `${inicio}${inicio && ditado ? " " : ""}${ditado}`;
      setResposta(novo);
      guardarRascunho(chaveRascunho, novo);
    };
    r.onend = () => setDitando(false);
    reconhecimento.current = r;
    setDitando(true);
    r.start();
  }

  function enviarResposta(ev?: React.FormEvent) {
    ev?.preventDefault();
    const texto = resposta.trim();
    if (!texto || enviando) return;
    const achado = acharSensivel(texto);
    if (achado) {
      setErro(mensagemSensivel(achado, "enviar"));
      return;
    }
    void turno(texto);
  }

  const aoIncluir = (texto: string) => {
    const novo = resposta.trim() ? `${resposta.trim()}\n${texto}` : texto;
    setResposta(novo);
    guardarRascunho(chaveRascunho, novo);
  };

  const iaOcupada = escrevendo !== null || (e.ocupada && !enviando);
  const perguntaNaTela = escrevendo !== null ? escrevendo : pendente?.texto ?? null;
  const numero = e.perguntas.length + (escrevendo !== null && pendente === null ? 1 : 0);
  const motivoResponder = pausada ? "A mesa está pausada" : !resposta.trim() ? "Escrevam a resposta" : null;

  return (
    <div className="flex flex-col gap-8">
      <BarraDeTemas cobertos={e.temasCobertos} />

      {e.encerrada ? (
        <p className="inline-flex items-center gap-3 text-2xl font-bold" role="status">
          <Icone nome="visto" className="h-7 w-7 text-estado-pronta" />
          Entrevista encerrada. Cliquem em Passo concluído.
        </p>
      ) : (
        <section ref={secaoPergunta} aria-label="Pergunta da IA" className="flex scroll-mt-4 flex-col gap-5">
          <p className="text-lg text-tinta-suave">
            {numero > 0 ? `Pergunta ${numero}` : ""}
            {numero > 0 ? ". " : ""}
            Respondidas: {e.respondidas} de {e.minimo}.
          </p>
          {perguntaNaTela ? (
            <p aria-live="polite" className="font-titulo text-[40px] font-bold leading-[1.15]">
              {perguntaNaTela}
              {escrevendo !== null ? <span className="ml-1 animate-pulse" aria-hidden>▍</span> : null}
            </p>
          ) : iaOcupada ? (
            <p className="text-2xl text-tinta-suave" role="status">A IA está pensando na próxima pergunta.</p>
          ) : null}

          {pendente && escrevendo === null ? (
            <form onSubmit={enviarResposta} className="flex flex-col gap-3">
              <label htmlFor="resposta" className="text-xl font-bold">
                Resposta da mesa
              </label>
              <textarea
                id="resposta"
                rows={4}
                value={resposta}
                maxLength={4000}
                onChange={(ev) => {
                  setResposta(ev.target.value);
                  guardarRascunho(chaveRascunho, ev.target.value);
                }}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" && !ev.shiftKey) {
                    ev.preventDefault();
                    enviarResposta();
                  }
                }}
                className="rounded-folha border-2 border-linha bg-papel px-4 py-3 text-2xl leading-normal"
                aria-describedby="resposta-ajuda"
              />
              <p id="resposta-ajuda" className="text-base text-tinta-suave">
                Enter envia. Shift e Enter pulam linha.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Botao
                  type="submit"
                  variante="secundario"
                  tamanho="mesa"
                  disabled={Boolean(motivoResponder)}
                  motivo={motivoResponder}
                  enviando={enviando}
                  textoEnviando="Enviando"
                >
                  Responder
                </Botao>
                {temDitado ? (
                  <Botao variante="discreto" tamanho="mesa" onClick={ditar} disabled={pausada}>
                    {ditando ? "Parar de ditar" : "Ditar a resposta"}
                  </Botao>
                ) : null}
              </div>
            </form>
          ) : null}

          {erro ? (
            <div role="alert" className="flex flex-wrap items-center gap-4 rounded-folha border-2 border-estado-atrasada bg-papel p-4">
              <p className="flex-1 text-xl font-bold">{erro}</p>
              {!pendente || escrevendo !== null ? (
                <Botao variante="secundario" tamanho="mesa" onClick={() => void turno()} disabled={enviando || pausada}>
                  Tentar de novo
                </Botao>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-4 border-t-2 border-linha pt-5">
            {e.podeEncerrar ? (
              <Botao
                variante="secundario"
                tamanho="mesa"
                disabled={enviando || pausada}
                onClick={() => void aoAgir(`${base}/entrevista/encerrar`)}
              >
                Encerrar entrevista
              </Botao>
            ) : (
              <p className="text-lg text-tinta-suave">{e.falta} para poder encerrar a entrevista.</p>
            )}
          </div>
        </section>
      )}

      <FilaDeContribuicoes estado={estado} codigo={codigo} aoAgir={aoAgir} somenteLeitura={false} aoIncluir={aoIncluir} />
      <ListaDeRespondidas estado={estado} />
    </div>
  );
}
