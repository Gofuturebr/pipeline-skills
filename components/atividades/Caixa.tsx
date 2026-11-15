"use client";

import { useState } from "react";
import { Botao } from "@/components/base/Botao";
import { Markdown } from "@/components/base/Markdown";
import { enviar } from "@/lib/cliente/estado-remoto";
import { acharSensivel, mensagemSensivel } from "@/lib/sensivel";
import type { EstadoMesaApi } from "@/lib/tipos-api";
import { Erro, Feito, blocosDoResultado, ultimaRodada } from "./comum";
import type { PropsAtividade } from "./tipos";

// Caixa de ferramentas (Fase 3): o Guardião congela as partes boas do resultado
// (a IA troca o específico por lacunas e a mesa confirma) e salva o resultado
// aprovado como exemplo.

interface Proposta {
  nome_arquivo: string;
  pra_que_serve: string;
  conteudo: string;
}

function modelosDaPasta(estado: EstadoMesaApi) {
  const indice = estado.arquivos.find((a) => a.caminho === "arquivos/INDICE.md")?.conteudo ?? "";
  return estado.arquivos
    .filter((a) => a.caminho.startsWith("arquivos/") && a.caminho !== "arquivos/INDICE.md")
    .map((a) => {
      const nome = a.caminho.replace("arquivos/", "");
      const linha = indice.split("\n").find((l) => l.includes(`\`${nome}\``));
      return { nome, praQueServe: linha?.split("`: ")[1]?.replace(/\s*\(\d{2}\/\d{2}\/\d{4}\)\s*$/, "") ?? "" };
    });
}

export function AtividadeCaixa(props: PropsAtividade) {
  const acao = String(props.passo.config.acao ?? "congelar");
  return acao === "exemplo" ? <SalvarExemplo {...props} /> : <Congelar {...props} />;
}

function ListaDeModelos({ estado }: { estado: EstadoMesaApi }) {
  const modelos = modelosDaPasta(estado);
  if (modelos.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-titulo text-[24px] font-semibold">Na caixa de ferramentas</h3>
      <ul className="flex flex-col gap-2">
        {modelos.map((m) => (
          <li key={m.nome} className="rounded-folha border-2 border-pasta-sombra bg-papel px-4 py-3 text-xl">
            <span className="font-mono">{m.nome}</span>
            {m.praQueServe ? `: ${m.praQueServe}` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Congelar(props: PropsAtividade) {
  const { estado, codigo, aoAgir, somenteLeitura } = props;
  const rodada = ultimaRodada(estado, "exemplo", "segunda");
  const [preparando, setPreparando] = useState<number | null>(null);
  const [proposta, setProposta] = useState<(Proposta & { bloco: number }) | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardados, setGuardados] = useState<Set<number>>(new Set());
  const pausada = estado.mesa.estado === "pausada";

  if (somenteLeitura) return <ListaDeModelos estado={estado} />;
  if (!rodada) return <p className="text-xl">Rodem a tarefa no passo anterior para ter o que congelar.</p>;

  const blocos = blocosDoResultado(rodada.saida);

  async function pedirModelo(i: number) {
    setErro(null);
    setPreparando(i);
    const r = await enviar<{ proposta: Proposta }>(`/api/mesa/${encodeURIComponent(codigo)}/caixa/congelar`, {
      trecho: blocos[i],
    });
    setPreparando(null);
    if (!r.ok) setErro(r.mensagem);
    else setProposta({ ...r.dados.proposta, bloco: i });
  }

  async function guardar() {
    if (!proposta) return;
    const achado = acharSensivel(`${proposta.conteudo} ${proposta.pra_que_serve}`);
    if (achado) {
      setErro(mensagemSensivel(achado));
      return;
    }
    setGuardando(true);
    const ok = await aoAgir(`/api/mesa/${encodeURIComponent(codigo)}/caixa/guardar`, {
      nomeArquivo: proposta.nome_arquivo,
      praQueServe: proposta.pra_que_serve,
      conteudo: proposta.conteudo,
    });
    setGuardando(false);
    if (ok) {
      setGuardados((g) => new Set(g).add(proposta.bloco));
      setProposta(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {erro ? <Erro texto={erro} /> : null}
      {proposta ? (
        <section className="flex flex-col gap-4 rounded-folha border-2 border-petroleo bg-papel p-6" aria-label="Modelo proposto">
          <h3 className="font-titulo text-[26px] font-semibold">Modelo proposto pela IA</h3>
          <p className="text-lg text-tinta-suave">
            As partes entre colchetes mudam de um caso para outro. Ajustem se precisar e guardem.
          </p>
          <label className="flex flex-col gap-1.5 text-lg font-bold">
            Nome do arquivo
            <input
              value={proposta.nome_arquivo}
              onChange={(e) => setProposta({ ...proposta, nome_arquivo: e.target.value })}
              className="min-h-12 rounded-folha border-2 border-linha px-3 font-mono text-xl font-normal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-lg font-bold">
            Para que serve
            <input
              value={proposta.pra_que_serve}
              onChange={(e) => setProposta({ ...proposta, pra_que_serve: e.target.value })}
              className="min-h-12 rounded-folha border-2 border-linha px-3 text-xl font-normal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-lg font-bold">
            Modelo
            <textarea
              rows={Math.min(14, proposta.conteudo.split("\n").length + 1)}
              value={proposta.conteudo}
              onChange={(e) => setProposta({ ...proposta, conteudo: e.target.value })}
              className="rounded-folha border-2 border-linha px-3 py-2 font-mono text-lg font-normal leading-normal"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Botao variante="secundario" tamanho="mesa" enviando={guardando} textoEnviando="Guardando" onClick={guardar}>
              Guardar na pasta
            </Botao>
            <Botao variante="discreto" tamanho="mesa" onClick={() => setProposta(null)}>
              Descartar
            </Botao>
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h3 className="font-titulo text-[24px] font-semibold">Resultado da última rodada, por partes</h3>
        {blocos.map((b, i) => (
          <article key={i} className="flex flex-col gap-3 rounded-folha border-2 border-linha bg-papel p-5">
            <Markdown texto={b} />
            <div className="flex flex-wrap items-center gap-3">
              {guardados.has(i) ? <Feito>Guardado na pasta</Feito> : null}
              <Botao
                variante="secundario"
                disabled={pausada || preparando !== null || proposta !== null}
                enviando={preparando === i}
                textoEnviando="A IA está preparando o modelo"
                onClick={() => void pedirModelo(i)}
              >
                Congelar
              </Botao>
            </div>
          </article>
        ))}
      </section>
      <ListaDeModelos estado={estado} />
    </div>
  );
}

function SalvarExemplo(props: PropsAtividade) {
  const { estado, codigo, aoAgir, somenteLeitura } = props;
  const rodada = ultimaRodada(estado, "exemplo", "segunda");
  const [texto, setTexto] = useState(rodada?.saida ?? "");
  const [de, setDe] = useState(rodada?.id ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const exemplos = estado.arquivos.filter((a) => a.caminho.startsWith("exemplos/"));
  const pausada = estado.mesa.estado === "pausada";

  // Rodada nova: o campo passa a ser o resultado dela.
  if (rodada && rodada.id !== de) {
    setDe(rodada.id);
    setTexto(rodada.saida);
  }

  const lista = exemplos.length ? (
    <ul className="flex flex-col gap-2">
      {exemplos.map((a) => (
        <li key={a.caminho} className="font-mono text-xl">
          {a.caminho}
        </li>
      ))}
    </ul>
  ) : null;

  if (somenteLeitura) return lista;
  if (!rodada) return <p className="text-xl">Rodem a tarefa para ter um resultado para salvar.</p>;

  return (
    <div className="flex flex-col gap-5">
      {erro ? <Erro texto={erro} /> : null}
      <label className="flex flex-col gap-2 text-xl font-bold">
        Resultado aprovado pela mesa
        <textarea
          rows={Math.min(14, texto.split("\n").length + 2)}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="rounded-folha border-2 border-linha bg-papel px-4 py-3 text-xl font-normal leading-normal"
        />
      </label>
      <p className="text-lg text-tinta-suave">Corrijam o que precisar antes de salvar. O exemplo entra em exemplos/.</p>
      <div className="flex flex-wrap items-center gap-4">
        <Botao
          variante="secundario"
          tamanho="mesa"
          disabled={pausada || !texto.trim()}
          enviando={salvando}
          textoEnviando="Salvando"
          onClick={async () => {
            const achado = acharSensivel(texto);
            if (achado) {
              setErro(mensagemSensivel(achado));
              return;
            }
            setErro(null);
            setSalvando(true);
            await aoAgir(`/api/mesa/${encodeURIComponent(codigo)}/caixa/exemplo`, { rodadaId: rodada.id, texto });
            setSalvando(false);
          }}
        >
          Salvar como exemplo
        </Botao>
      </div>
      {exemplos.length ? (
        <section className="flex flex-col gap-2">
          <Feito>Exemplos na pasta</Feito>
          {lista}
        </section>
      ) : null}
    </div>
  );
}
