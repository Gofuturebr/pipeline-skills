"use client";

import { useState } from "react";
import { Botao } from "@/components/base/Botao";
import { Icone } from "@/components/base/Icone";
import { MAXIMO_CONFERENCIAS, MINIMO_CONFERENCIAS, lerProntoQuando, motivoDaRecusa } from "@/lib/conferencias";
import { lerSecao } from "@/lib/markdown";
import type { ConferenciaApi } from "@/lib/tipos-api";
import { ultimaRodada } from "./comum";
import type { PropsAtividade } from "./tipos";

// Conferências da prova (Fase 4, RN08): cada linha diz o que confere e contra
// qual fonte. A validação acontece ao sair do campo; linha recusada fica com
// borda laranja e o motivo escrito abaixo.

export function AtividadeConferencias(props: PropsAtividade) {
  const { estado, codigo, aoAgir, somenteLeitura, passo } = props;
  const conferencias = estado.conferencias;
  const validas = conferencias.filter((c) => c.valida).length;
  const [novas, setNovas] = useState(0);
  const [importando, setImportando] = useState(false);
  const pausada = estado.mesa.estado === "pausada";
  const base = `/api/mesa/${encodeURIComponent(codigo)}`;
  const skill = estado.arquivos.find((a) => a.caminho === "SKILL.md")?.conteudo ?? "";
  const doSkill = lerProntoQuando(lerSecao(skill, "Pronto quando") ?? "");
  const placar = passo.config.modo === "ajuste" ? ultimaRodada(estado, "prova")?.placar ?? null : null;
  const naoConferidas = new Set((placar ?? []).filter((p) => !p.conseguiuConferir).map((p) => p.conferenciaId));

  if (somenteLeitura) {
    return (
      <ol className="flex list-decimal flex-col gap-2 pl-8 text-xl">
        {conferencias.map((c) => (
          <li key={c.id}>
            {c.descricao} <span className="text-tinta-suave">(fonte: {c.fonte || "falta"})</span>
          </li>
        ))}
      </ol>
    );
  }

  const total = conferencias.length + novas;

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-3 min-[1180px]:grid-cols-2" aria-label="Exemplo de conferência">
        <div className="rounded-folha border-2 border-estado-pronta bg-papel p-4 text-lg">
          <p className="inline-flex items-center gap-2 font-bold">
            <Icone nome="visto" className="h-5 w-5 text-estado-pronta" />
            Conferência boa
          </p>
          <p className="mt-1">O total bate com a soma dos itens. Fonte: tabela de preços do kit.</p>
        </div>
        <div className="rounded-folha border-2 border-estado-atrasada bg-papel p-4 text-lg">
          <p className="inline-flex items-center gap-2 font-bold">
            <Icone nome="xis" className="h-5 w-5 text-estado-atrasada" />
            Conferência ruim
          </p>
          <p className="mt-1">A mensagem está clara e profissional. Sem fonte: não dá para conferir.</p>
        </div>
      </section>

      {placar && naoConferidas.size > 0 ? (
        <p className="rounded-folha border-2 border-estado-atrasada bg-papel p-4 text-xl" role="status">
          A IA não conseguiu conferir {naoConferidas.size === 1 ? "1 item" : `${naoConferidas.size} itens`}, marcados
          abaixo. Ajustem a fonte para algo que venha no caso ou nos materiais, ou tirem o item.
        </p>
      ) : null}

      {conferencias.length === 0 && doSkill.length > 0 ? (
        <div className="flex flex-wrap items-center gap-4 rounded-folha border-2 border-petroleo bg-papel p-5">
          <p className="flex-1 text-xl">O SKILL.md já tem {doSkill.length} itens em Pronto quando. Querem começar por eles?</p>
          <Botao
            variante="secundario"
            tamanho="mesa"
            disabled={pausada}
            enviando={importando}
            textoEnviando="Trazendo"
            onClick={async () => {
              setImportando(true);
              await aoAgir(`${base}/conferencias/importar`);
              setImportando(false);
            }}
          >
            Trazer do SKILL.md
          </Botao>
        </div>
      ) : null}

      <ol className="flex flex-col gap-4">
        {conferencias.map((c) => (
          <LinhaDeConferencia
            key={`${c.id}:${c.descricao}:${c.fonte}`}
            conferencia={c}
            palavrasVagas={estado.evento.palavrasVagas}
            naoConferida={naoConferidas.has(c.id)}
            desabilitada={pausada}
            aoSalvar={(descricao, fonte) => aoAgir(`${base}/conferencias`, { id: c.id, descricao, fonte })}
            aoTirar={() => aoAgir(`${base}/conferencias/remover`, { id: c.id })}
          />
        ))}
        {Array.from({ length: novas }, (_, i) => (
          <LinhaDeConferencia
            key={`nova-${conferencias.length + i}`}
            numero={conferencias.length + i + 1}
            palavrasVagas={estado.evento.palavrasVagas}
            desabilitada={pausada}
            aoSalvar={async (descricao, fonte) => {
              const ok = await aoAgir(`${base}/conferencias`, { descricao, fonte });
              if (ok) setNovas((n) => Math.max(0, n - 1));
              return ok;
            }}
            aoTirar={async () => {
              setNovas((n) => Math.max(0, n - 1));
              return true;
            }}
          />
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-4">
        <Botao
          variante="secundario"
          tamanho="mesa"
          disabled={pausada || total >= MAXIMO_CONFERENCIAS}
          motivo={total >= MAXIMO_CONFERENCIAS ? `No máximo ${MAXIMO_CONFERENCIAS}` : null}
          onClick={() => setNovas((n) => n + 1)}
        >
          Acrescentar conferência
        </Botao>
        <p className="text-xl font-bold" role="status">
          Válidas: {validas}. A prova pede de {MINIMO_CONFERENCIAS} a {MAXIMO_CONFERENCIAS}.
        </p>
      </div>
    </div>
  );
}

function LinhaDeConferencia({
  conferencia,
  numero,
  palavrasVagas,
  naoConferida = false,
  desabilitada,
  aoSalvar,
  aoTirar,
}: {
  conferencia?: ConferenciaApi;
  numero?: number;
  palavrasVagas: string[];
  naoConferida?: boolean;
  desabilitada: boolean;
  aoSalvar: (descricao: string, fonte: string) => Promise<boolean>;
  aoTirar: () => Promise<boolean>;
}) {
  const [descricao, setDescricao] = useState(conferencia?.descricao ?? "");
  const [fonte, setFonte] = useState(conferencia?.fonte ?? "");
  const [motivoLocal, setMotivoLocal] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const motivo = motivoLocal ?? conferencia?.motivo ?? null;
  const recusada = Boolean(motivo);
  const n = conferencia?.numero ?? numero ?? 0;

  async function aoSair() {
    const mudou = descricao !== (conferencia?.descricao ?? "") || fonte !== (conferencia?.fonte ?? "");
    if (!mudou) return;
    // Linha nova só vai para o servidor quando tem o que confere.
    if (!conferencia && !descricao.trim()) return;
    setMotivoLocal(motivoDaRecusa(descricao, fonte, palavrasVagas));
    setSalvando(true);
    await aoSalvar(descricao, fonte);
    setSalvando(false);
  }

  return (
    <li
      className={`flex flex-col gap-3 rounded-folha border-2 bg-papel p-4 ${
        recusada ? "border-estado-atrasada" : naoConferida ? "border-estado-ajuda" : "border-linha"
      }`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) void aoSair();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg font-bold">Conferência {n}</span>
        <span className="flex items-center gap-3">
          {conferencia?.valida && !motivoLocal ? (
            <span className="inline-flex items-center gap-1.5 font-bold">
              <Icone nome="visto" className="h-5 w-5 text-estado-pronta" />
              Válida
            </span>
          ) : null}
          {salvando ? <span className="text-tinta-suave">Guardando</span> : null}
          <Botao variante="discreto" disabled={desabilitada} onClick={() => void aoTirar()}>
            Tirar
          </Botao>
        </span>
      </div>
      <div className="grid gap-3 min-[1180px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <label className="flex flex-col gap-1.5 text-lg font-bold">
          O que confere
          <input
            value={descricao}
            maxLength={400}
            disabled={desabilitada}
            onChange={(e) => {
              setDescricao(e.target.value);
              setMotivoLocal(null);
            }}
            className="min-h-14 rounded-folha border-2 border-linha px-3 text-xl font-normal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-lg font-bold">
          Contra qual fonte
          <input
            value={fonte}
            maxLength={300}
            disabled={desabilitada}
            onChange={(e) => {
              setFonte(e.target.value);
              setMotivoLocal(null);
            }}
            className="min-h-14 rounded-folha border-2 border-linha px-3 text-xl font-normal"
          />
        </label>
      </div>
      {motivo ? (
        <p className="text-lg font-bold" role="alert">
          {motivo}
        </p>
      ) : naoConferida ? (
        <p className="text-lg font-bold">A IA não conseguiu conferir este item com a fonte dada.</p>
      ) : null}
    </li>
  );
}
