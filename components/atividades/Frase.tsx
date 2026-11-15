"use client";

import { useState } from "react";
import { Botao } from "@/components/base/Botao";
import { Icone } from "@/components/base/Icone";
import { guardarRascunho, lerRascunho } from "@/lib/cliente/rascunho";
import { LIMITE_TAREFA, limparTarefa, problemaDaTarefa } from "@/lib/jornada";
import type { PropsAtividade } from "./tipos";

// Fase 1: a tarefa em uma linha, com verbo e resultado. Ela aparece na barra
// superior da mesa depois de confirmada.

export function AtividadeFrase(props: PropsAtividade) {
  if (props.passo.config.campo === "nome_skill") return <NomeDaSkill {...props} />;
  return <TarefaEmUmaLinha {...props} />;
}

/** Fase 7: o nome da skill vira o título do SKILL.md e o nome da pasta. */
function NomeDaSkill({ estado, codigo, aoAgir, somenteLeitura, passo }: PropsAtividade) {
  const e = estado.entrega;
  const [nome, setNome] = useState(e?.titulo ?? "");
  const [salvando, setSalvando] = useState(false);
  const limite = Number(passo.config.limite ?? 60);
  if (!e) return null;
  if (somenteLeitura || estado.mesa.final) return <p className="font-titulo text-[28px] font-bold">{e.titulo}</p>;
  const confirmado = e.nomeConfirmado && nome.trim() === e.titulo;
  return (
    <div className="flex flex-col gap-4">
      <label htmlFor="nome-skill" className="text-xl font-bold">
        Nome da skill
      </label>
      <input
        id="nome-skill"
        value={nome}
        maxLength={limite}
        onChange={(ev) => setNome(ev.target.value)}
        className="min-h-16 rounded-folha border-2 border-linha bg-papel px-4 font-titulo text-[28px]"
      />
      <p className="flex flex-wrap justify-between gap-3 text-lg text-tinta-suave">
        <span>Exemplo: {String(passo.config.exemplo ?? "")}</span>
        <span className="numeros-tabulares">
          {nome.length} de {limite} caracteres
        </span>
      </p>
      <p className="text-lg">
        A pasta vai se chamar <span className="font-mono font-bold">{e.nomePasta}</span>. O Claude exige letras minúsculas e
        hífens no nome da pasta.
      </p>
      {confirmado ? (
        <p className="inline-flex items-center gap-2 text-xl font-bold" role="status">
          <Icone nome="visto" className="h-6 w-6 text-estado-pronta" />
          Nome confirmado
        </p>
      ) : (
        <div>
          <Botao
            variante="secundario"
            tamanho="mesa"
            disabled={!nome.trim() || estado.mesa.estado === "pausada"}
            enviando={salvando}
            textoEnviando="Guardando"
            onClick={async () => {
              setSalvando(true);
              await aoAgir(`/api/mesa/${encodeURIComponent(codigo)}/entrega/nome`, { nome });
              setSalvando(false);
            }}
          >
            Confirmar o nome
          </Botao>
        </div>
      )}
    </div>
  );
}

function TarefaEmUmaLinha(props: PropsAtividade) {
  const { estado, codigo, aoAgir, somenteLeitura, passo } = props;
  const salva = estado.mesa.tarefa;
  const chave = `mesa:${codigo}:rascunho:tarefa`;
  const [texto, setTexto] = useState(() => lerRascunho(chave) ?? salva);
  const [enviando, setEnviando] = useState(false);
  const limite = Number(passo.config.limite ?? LIMITE_TAREFA);
  const exemplo = String(passo.config.exemplo ?? "");

  if (somenteLeitura) {
    return salva ? (
      <p className="rounded-folha border-2 border-linha bg-papel px-5 py-4 font-titulo text-[28px] font-semibold">{salva}</p>
    ) : (
      <p className="text-xl text-tinta-suave">A tarefa ainda não foi confirmada.</p>
    );
  }

  const confirmada = salva !== "" && limparTarefa(texto) === salva;
  const problema = problemaDaTarefa(texto);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (problema) return;
    setEnviando(true);
    const ok = await aoAgir(`/api/mesa/${encodeURIComponent(codigo)}/tarefa`, { texto });
    setEnviando(false);
    if (ok) guardarRascunho(chave, "");
  }

  return (
    <form onSubmit={confirmar} className="flex flex-col gap-4">
      <label htmlFor="tarefa" className="text-xl font-bold">
        A tarefa em uma linha
      </label>
      <input
        id="tarefa"
        value={texto}
        maxLength={limite}
        autoComplete="off"
        onChange={(e) => {
          setTexto(e.target.value);
          guardarRascunho(chave, e.target.value);
        }}
        aria-describedby="tarefa-ajuda"
        className="min-h-16 rounded-folha border-2 border-linha bg-papel px-4 font-titulo text-[28px]"
      />
      <p id="tarefa-ajuda" className="flex flex-wrap justify-between gap-3 text-lg text-tinta-suave">
        <span>{exemplo ? `Exemplo: ${exemplo}` : null}</span>
        <span className="numeros-tabulares">
          {texto.length} de {limite} caracteres
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-4">
        {confirmada ? (
          <p className="inline-flex items-center gap-2 text-xl font-bold" role="status">
            <Icone nome="visto" className="h-6 w-6 text-estado-pronta" />
            Tarefa confirmada
          </p>
        ) : (
          <Botao
            type="submit"
            variante="secundario"
            tamanho="mesa"
            disabled={Boolean(problema) || estado.mesa.estado === "pausada"}
            motivo={texto.trim() ? problema : null}
            enviando={enviando}
            textoEnviando="Guardando"
          >
            Confirmar a tarefa
          </Botao>
        )}
      </div>
    </form>
  );
}
