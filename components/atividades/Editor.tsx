"use client";

import { useState } from "react";
import { Botao } from "@/components/base/Botao";
import { Dialogo } from "@/components/base/Dialogo";
import { Icone } from "@/components/base/Icone";
import { Markdown } from "@/components/base/Markdown";
import { guardarRascunho, lerRascunho } from "@/lib/cliente/rascunho";
import { dividirSecoes } from "@/lib/markdown";
import { acharSensivel, mensagemSensivel } from "@/lib/sensivel";
import type { ArquivoApi } from "@/lib/tipos-api";
import type { PropsAtividade } from "./tipos";
import { Erro, TextoSendoEscrito, useEscritaDaIA } from "./comum";

// Editor do SKILL.md (Fase 2): a IA escreve, a mesa responde às duas perguntas
// finais, corrige por seção e aprova. Cada seção mostra o texto formatado; ao
// clicar em "Editar", vira campo de texto.

export function AtividadeEditor(props: PropsAtividade) {
  const acao = String(props.passo.config.acao ?? "");
  const caminho = String(props.passo.config.arquivo ?? "SKILL.md");
  const arquivo = props.estado.arquivos.find((a) => a.caminho === caminho) ?? null;
  if (props.somenteLeitura) {
    return arquivo ? <Markdown texto={arquivo.conteudo} /> : <p className="text-xl text-tinta-suave">Arquivo ainda não escrito.</p>;
  }
  if (acao === "gerar") return <GerarSkill {...props} arquivo={arquivo} />;
  if (acao === "final") return <MarcarFinal {...props} />;
  if (props.passo.config.secao) return <RevisarSecao {...props} arquivo={arquivo} caminho={caminho} />;
  return <RevisarSkill {...props} arquivo={arquivo} caminho={caminho} />;
}

function GerarSkill(props: PropsAtividade & { arquivo: ArquivoApi | null }) {
  const { estado, codigo, arquivo } = props;
  const e = estado.entrevista;
  const { escrevendo, erro, pedir } = useEscritaDaIA(props.aoSubstituir);
  const [confirmarDeNovo, setConfirmarDeNovo] = useState(false);
  const url = `/api/mesa/${encodeURIComponent(codigo)}/skill/gerar`;
  const pausada = estado.mesa.estado === "pausada";
  const motivo = pausada ? "A mesa está pausada" : e?.falta ? `${e.falta} na entrevista` : null;

  if (escrevendo !== null) return <TextoSendoEscrito texto={escrevendo} />;
  return (
    <div className="flex flex-col gap-6">
      {erro ? <Erro texto={erro} /> : null}
      {arquivo ? (
        <>
          <p className="inline-flex items-center gap-2 text-xl font-bold" role="status">
            <Icone nome="visto" className="h-6 w-6 text-estado-pronta" />
            O SKILL.md está na pasta. Cliquem em Passo concluído para revisar.
          </p>
          <div className="rounded-folha border-2 border-linha bg-papel p-6">
            <Markdown texto={arquivo.conteudo} />
          </div>
          <div>
            <Botao variante="discreto" disabled={pausada} onClick={() => setConfirmarDeNovo(true)}>
              Pedir para a IA escrever de novo
            </Botao>
          </div>
          <Dialogo
            aberto={confirmarDeNovo}
            titulo="Escrever o SKILL.md de novo?"
            textoConfirmar="Escrever de novo"
            aoConfirmar={async () => {
              setConfirmarDeNovo(false);
              await pedir(url);
            }}
            aoCancelar={() => setConfirmarDeNovo(false)}
          >
            <p>A versão atual não se perde: ela fica no histórico do arquivo.</p>
          </Dialogo>
        </>
      ) : (
        <>
          <p className="max-w-[60ch] text-xl leading-normal">
            A IA vai juntar o que vocês contaram na entrevista e escrever as instruções da skill, com 7 partes: pra que
            serve, quando usar, o que precisa, passos, decisões, pronto quando e casos que já deram errado.
          </p>
          <div>
            <Botao
              variante="secundario"
              tamanho="mesa"
              disabled={Boolean(motivo)}
              motivo={motivo}
              onClick={() => void pedir(url)}
            >
              Pedir à IA para escrever o SKILL.md
            </Botao>
          </div>
        </>
      )}
    </div>
  );
}

function RevisarSkill(props: PropsAtividade & { arquivo: ArquivoApi | null; caminho: string }) {
  const { estado, codigo, arquivo, caminho } = props;
  const e = estado.entrevista;
  const { escrevendo, erro, pedir } = useEscritaDaIA(props.aoSubstituir);
  const chaveErrou = `mesa:${codigo}:rascunho:errou`;
  const chaveEsqueceu = `mesa:${codigo}:rascunho:esqueceu`;
  const [errou, setErrou] = useState(() => lerRascunho(chaveErrou) ?? e?.respostasFinais.errou ?? "");
  const [esqueceu, setEsqueceu] = useState(() => lerRascunho(chaveEsqueceu) ?? e?.respostasFinais.esqueceu ?? "");
  const pausada = estado.mesa.estado === "pausada";

  if (!arquivo) return <p className="text-xl">A IA ainda não escreveu o SKILL.md. Voltem ao passo anterior.</p>;
  if (escrevendo !== null) return <TextoSendoEscrito texto={escrevendo} />;

  const aprovado = e?.skillAprovadaVersao === arquivo.versao;
  const perguntas = e?.perguntasFinais ?? ["O que eu errei?", "O que vocês esqueceram de me contar?"];
  const mudancas = e?.revisao?.mudancas ?? [];
  const versaoDaIA = e?.revisao?.versaoDaIA ?? arquivo.versao;

  // O passo é validar: no alto, o que mudou desde a versão da IA e o botão de
  // aprovar. Responder às perguntas da IA e corrigir parte por parte ficam
  // recolhidos e abrem só quando a mesa quer mudar alguma coisa.
  return (
    <div className="flex flex-col gap-6">
      {erro ? <Erro texto={erro} /> : null}

      <section className="flex flex-col gap-4 rounded-folha border-2 border-petroleo bg-papel p-6">
        {mudancas.length ? (
          <>
            <h3 className="font-titulo text-[28px] font-semibold leading-tight">
              O que mudou desde a versão da IA (versão {versaoDaIA} para {arquivo.versao})
            </h3>
            <ul className="flex flex-col gap-4">
              {mudancas.map((m) => (
                <li key={`${m.tipo}:${m.secao}`} className="flex flex-col gap-1 border-l-4 border-petroleo pl-4">
                  <p className="text-xl font-bold">
                    {m.secao}
                    {m.tipo === "nova" ? ", parte nova" : m.tipo === "tirada" ? ", tirada do arquivo" : ""}
                  </p>
                  {m.tipo !== "tirada" ? <Markdown texto={m.texto || "(vazio)"} /> : null}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h3 className="font-titulo text-[28px] font-semibold leading-tight">O SKILL.md está como a IA escreveu</h3>
            <p className="text-xl leading-normal">
              Leiam o arquivo na pasta amarela, à direita. Se estiver bom, aprovem. Se algo estiver errado ou
              faltando, abram uma das opções abaixo.
            </p>
          </>
        )}
        <div className="flex flex-wrap items-center gap-4 border-t-2 border-linha pt-4">
          {aprovado ? (
            <p className="inline-flex items-center gap-2 text-2xl font-bold" role="status">
              <Icone nome="visto" className="h-7 w-7 text-estado-pronta" />
              Aprovado. Esta é a versão {arquivo.versao}.
            </p>
          ) : (
            <>
              <Botao
                variante="secundario"
                tamanho="mesa"
                disabled={pausada}
                onClick={() => void props.aoAgir(`/api/mesa/${encodeURIComponent(codigo)}/skill/aprovar`)}
              >
                Aprovar o SKILL.md
              </Botao>
              {e?.skillAprovadaVersao ? (
                <span className="text-lg text-tinta-suave">O arquivo mudou depois da aprovação. Aprovem de novo.</span>
              ) : null}
            </>
          )}
        </div>
      </section>

      <details open={Boolean(errou.trim() || esqueceu.trim()) || undefined} className="rounded-folha border-2 border-linha bg-papel p-5">
        <summary className="min-h-12 cursor-pointer text-2xl font-bold">
          Responder às perguntas da IA: {perguntas.join(" ")}
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          {[
            { rotulo: perguntas[0], valor: errou, mudar: setErrou, chave: chaveErrou },
            { rotulo: perguntas[1], valor: esqueceu, mudar: setEsqueceu, chave: chaveEsqueceu },
          ].map((q) => (
            <label key={q.chave} className="flex flex-col gap-2">
              <span className="text-xl font-bold">{q.rotulo}</span>
              <textarea
                rows={2}
                value={q.valor}
                maxLength={4000}
                onChange={(ev) => {
                  q.mudar(ev.target.value);
                  guardarRascunho(q.chave, ev.target.value);
                }}
                className="rounded-folha border-2 border-linha bg-papel px-4 py-3 text-xl leading-normal"
              />
            </label>
          ))}
          <div>
            <Botao
              variante="secundario"
              tamanho="mesa"
              disabled={pausada || (!errou.trim() && !esqueceu.trim())}
              motivo={pausada ? "A mesa está pausada" : !errou.trim() && !esqueceu.trim() ? "Respondam pelo menos uma pergunta" : null}
              onClick={async () => {
                const ok = await pedir(`/api/mesa/${encodeURIComponent(codigo)}/skill/corrigir`, { errou, esqueceu });
                if (ok) {
                  guardarRascunho(chaveErrou, "");
                  guardarRascunho(chaveEsqueceu, "");
                }
              }}
            >
              Pedir à IA para corrigir
            </Botao>
          </div>
        </div>
      </details>

      <details className="rounded-folha border-2 border-linha bg-papel p-5">
        <summary className="min-h-12 cursor-pointer text-2xl font-bold">Corrigir o arquivo parte por parte</summary>
        <div className="mt-4">
          <EditorPorSecoes {...props} arquivo={arquivo} caminho={caminho} />
        </div>
      </details>
    </div>
  );
}

/** Edição por seções de um arquivo da pasta, com o texto formatado ao lado. */
export function EditorPorSecoes({
  estado,
  codigo,
  aoAgir,
  arquivo,
  caminho,
  secoesEditaveis,
  somenteSecoes,
}: PropsAtividade & { arquivo: ArquivoApi; caminho: string; secoesEditaveis?: string[]; somenteSecoes?: string[] }) {
  const partes = dividirSecoes(arquivo.conteudo);
  const [editando, setEditando] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const pausada = estado.mesa.estado === "pausada";
  const TITULO = "__titulo__";

  // Rascunho de cada seção guardado no navegador a cada tecla (seção 3 do frontend).
  const chaveRascunho = (chave: string) => `mesa:${codigo}:rascunho:secao:${caminho}:${chave}`;

  function abrir(chave: string, valor: string) {
    setErro(null);
    setEditando(chave);
    setTexto(lerRascunho(chaveRascunho(chave)) ?? valor);
  }

  function fechar() {
    if (editando !== null) guardarRascunho(chaveRascunho(editando), "");
    setEditando(null);
  }

  async function guardar() {
    if (editando === null) return;
    const achado = acharSensivel(texto);
    if (achado) {
      setErro(mensagemSensivel(achado));
      return;
    }
    setGuardando(true);
    const ok = await aoAgir(`/api/mesa/${encodeURIComponent(codigo)}/arquivos/secao`, {
      caminho,
      secao: editando === TITULO ? null : editando,
      corpo: texto,
      versao: arquivo.versao,
    });
    setGuardando(false);
    if (ok) fechar();
  }

  const podeEditar = (nome: string) => !secoesEditaveis || secoesEditaveis.includes(nome);

  const bloco = (chave: string, rotulo: string, valor: string, formatado: React.ReactNode) => (
    <section key={chave} className="flex flex-col gap-3 rounded-folha border-2 border-linha bg-papel p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-titulo text-[24px] font-semibold leading-tight">{rotulo}</h3>
        {editando !== chave && podeEditar(chave) ? (
          <Botao variante="discreto" disabled={pausada || estado.mesa.final} onClick={() => abrir(chave, valor)}>
            Editar
          </Botao>
        ) : null}
      </div>
      {editando === chave ? (
        <div className="flex flex-col gap-3">
          <textarea
            autoFocus
            rows={chave === TITULO ? 1 : Math.min(14, Math.max(4, valor.split("\n").length + 1))}
            value={texto}
            onChange={(ev) => {
              setTexto(ev.target.value);
              guardarRascunho(chaveRascunho(chave), ev.target.value);
            }}
            className="rounded-folha border-2 border-petroleo bg-papel px-4 py-3 font-mono text-lg leading-normal"
            aria-label={`Texto de ${rotulo}`}
          />
          {erro ? (
            <p role="alert" className="text-lg font-bold">
              {erro}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Botao variante="secundario" tamanho="mesa" enviando={guardando} textoEnviando="Guardando" onClick={guardar}>
              Guardar na pasta
            </Botao>
            <Botao variante="discreto" tamanho="mesa" onClick={fechar}>
              Cancelar
            </Botao>
          </div>
        </div>
      ) : (
        formatado
      )}
    </section>
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg text-tinta-suave">
        {caminho}, versão {arquivo.versao}
      </p>
      {partes.titulo && podeEditar(TITULO) && !somenteSecoes
        ? bloco(TITULO, "Nome da skill", partes.titulo, <p className="font-titulo text-[28px] font-bold">{partes.titulo}</p>)
        : null}
      {partes.secoes
        .filter((s) => !somenteSecoes || somenteSecoes.includes(s.nome))
        .map((s) => bloco(s.nome, s.nome, s.corpo, <Markdown texto={s.corpo || "(vazio)"} />))}
    </div>
  );
}

/** Fase 7: a mesa revisa a seção Quando usar, com as palavras de quem pede a tarefa. */
function RevisarSecao(props: PropsAtividade & { arquivo: ArquivoApi | null; caminho: string }) {
  const { estado, codigo, aoAgir, arquivo, caminho } = props;
  const secao = String(props.passo.config.secao);
  const e = estado.entrega;
  if (!arquivo || !e) return null;
  return (
    <div className="flex flex-col gap-6">
      <EditorPorSecoes {...props} arquivo={arquivo} caminho={caminho} secoesEditaveis={[secao]} somenteSecoes={[secao]} />
      <section className="rounded-folha border-2 border-petroleo bg-papel p-5">
        <h3 className="text-lg font-bold text-tinta-suave">Assim o Claude vai saber quando usar a skill</h3>
        <p className="mt-2 text-xl leading-normal">{e.descricao}</p>
      </section>
      {e.quandoRevisado ? (
        <p className="inline-flex items-center gap-2 text-xl font-bold" role="status">
          <Icone nome="visto" className="h-6 w-6 text-estado-pronta" />
          Seção revisada
        </p>
      ) : (
        <div>
          <Botao
            variante="secundario"
            tamanho="mesa"
            disabled={estado.mesa.estado === "pausada" || estado.mesa.final}
            onClick={() => void aoAgir(`/api/mesa/${encodeURIComponent(codigo)}/entrega/quando`)}
          >
            Revisamos a seção {secao}
          </Botao>
        </div>
      )}
    </div>
  );
}

/** Fase 7: marcar como final trava a skill (RN15). Depois, o download fica liberado. */
function MarcarFinal({ estado, codigo, aoAgir, somenteLeitura }: PropsAtividade) {
  const e = estado.entrega;
  const [confirmar, setConfirmar] = useState(false);
  if (!e) return null;
  const arquivos = estado.arquivos.map((a) => a.caminho);
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-folha border-2 border-linha bg-papel p-6">
        <p className="font-titulo text-[28px] font-bold">{e.titulo}</p>
        <p className="text-xl leading-normal">{e.descricao}</p>
        <p className="text-lg text-tinta-suave">
          Pasta <span className="font-mono">{e.nomePasta}</span>, com {arquivos.length} arquivos: {arquivos.join(", ")}.
        </p>
      </section>
      {estado.mesa.final ? (
        <div className="flex flex-col gap-4">
          <p className="inline-flex items-center gap-3 font-titulo text-[32px] font-bold" role="status">
            <Icone nome="visto" className="h-8 w-8 text-estado-pronta" />
            Skill pronta. Baixem a pasta pelo celular.
          </p>
          <a
            href={`/api/mesa/${encodeURIComponent(codigo)}/baixar`}
            className="inline-flex min-h-14 items-center self-start rounded-botao border-2 border-petroleo px-6 text-xl font-bold text-petroleo"
          >
            Baixar a pasta neste notebook
          </a>
        </div>
      ) : somenteLeitura ? null : (
        <>
          <div>
            <Botao variante="secundario" tamanho="mesa" disabled={estado.mesa.estado === "pausada"} onClick={() => setConfirmar(true)}>
              Marcar a skill como final
            </Botao>
          </div>
          <Dialogo
            aberto={confirmar}
            titulo="Marcar a skill como final? Depois disso, ela não pode mais ser editada."
            textoConfirmar="Marcar como final"
            aoConfirmar={async () => {
              setConfirmar(false);
              await aoAgir(`/api/mesa/${encodeURIComponent(codigo)}/entrega/final`);
            }}
            aoCancelar={() => setConfirmar(false)}
          >
            <p>Só o gestor consegue destravar. O download pelo celular fica liberado.</p>
          </Dialogo>
        </>
      )}
    </div>
  );
}
