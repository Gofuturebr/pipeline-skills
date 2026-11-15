"use client";

import { useEffect, useState } from "react";
import { Markdown } from "@/components/base/Markdown";
import type { DetalheMesaApi, RodadaApi } from "@/lib/tipos-api";

// Abas de leitura do detalhe da mesa: Pasta, Conversa, Linha do tempo e Teste.

export type AbaDetalhe = "pasta" | "conversa" | "linha" | "teste";

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const AUTOR: Record<string, string> = { gestor: "gestor", facilitador: "facilitador", mesa: "a mesa", sistema: "o sistema" };

/** Frase da linha do tempo para cada ação registrada (RN16). */
function textoDoRegistro(acao: string, d: Record<string, unknown>): string {
  const de = d.de as number | undefined;
  const para = d.para as number | undefined;
  const textos: Record<string, string> = {
    avancar: `Avançou da Fase ${de} para a Fase ${para}`,
    forcar: `Avanço forçado da Fase ${de} para a Fase ${para}`,
    voltar: `Voltou da Fase ${de} para a Fase ${para}`,
    desfazer_avanco: `Avanço desfeito: voltou para a Fase ${para}`,
    concluir_fase: `Concluiu a Fase ${d.fase ?? de ?? ""}`,
    pausar: "Mesa pausada",
    retomar: "Mesa retomada",
    ajustar_tempo: `Tempo ajustado em ${d.minutos} minutos`,
    aviso: `Aviso: ${d.texto ?? ""}`,
    pedir_ajuda: `Pediu ajuda na Fase ${d.fase}, passo ${d.passo}`,
    cancelar_ajuda: "Cancelou o pedido de ajuda",
    atender_chamado: "Chamado atendido",
    confirmar_tarefa: `Tarefa: ${d.tarefa ?? ""}`,
    encerrar_entrevista: `Encerrou a entrevista com ${d.perguntas} perguntas`,
    gerar_skill: "A IA escreveu o SKILL.md",
    corrigir_skill: "A IA corrigiu o SKILL.md",
    aprovar_skill: `Aprovou o SKILL.md, versão ${d.versao}`,
    rodada: `Rodada: ${d.tipo === "segunda" ? "segunda rodada" : "caso de exemplo"}`,
    guardar_modelo: `Guardou ${String(d.caminho ?? "").replace("arquivos/", "")} na caixa`,
    salvar_exemplo: `Salvou ${String(d.caminho ?? "").replace("exemplos/", "")} em exemplos`,
    placar: d.tipo === "teste" ? "Rodou o teste cruzado" : d.tipo === "conserto_depois" ? "Rodou de novo depois do conserto" : "Rodou a prova",
    enviar_relatorio: "Enviou o relatório do teste cruzado",
    trocar_parceira: `Passou a testar a skill da ${d.testa ?? "outra mesa"}`,
    aprovar_conserto: `Aprovou um conserto na camada ${d.camada}`,
    marcar_final: "Marcou a skill como final",
    destravar: "Skill destravada",
  };
  return textos[acao] ?? acao.replace(/_/g, " ");
}

function resumoDoPlacar(r: RodadaApi | null | undefined) {
  const p = r?.placar ?? [];
  return p.length ? `${p.filter((x) => x.passou).length} de ${p.length} passaram` : "ainda sem placar";
}

export function DetalheDaMesa({ mesaId, versao, aba }: { mesaId: string; versao: number; aba: AbaDetalhe }) {
  const [dados, setDados] = useState<DetalheMesaApi | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/admin/mesas/${mesaId}/detalhe`, { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (!vivo) return;
        if (!r.ok) setErro(j?.erro ?? "Não foi possível abrir o detalhe.");
        else {
          setErro(null);
          setDados(j);
        }
      })
      .catch(() => vivo && setErro("Sem conexão."));
    return () => {
      vivo = false;
    };
  }, [mesaId, versao]);

  if (erro) return <p className="p-5 font-bold">{erro}</p>;
  if (!dados || dados.mesaId !== mesaId) return <p className="p-5 text-tinta-suave">Carregando</p>;

  if (aba === "pasta") {
    const arquivo = dados.arquivos.find((a) => a.caminho === aberto) ?? null;
    return (
      <div className="flex flex-col gap-3 p-5">
        {dados.arquivos.length === 0 ? <p className="text-tinta-suave">A pasta ainda está vazia.</p> : null}
        <ul className="flex flex-col gap-1">
          {dados.arquivos.map((a) => (
            <li key={a.caminho}>
              <button
                type="button"
                aria-pressed={aberto === a.caminho}
                onClick={() => setAberto(aberto === a.caminho ? null : a.caminho)}
                className="flex min-h-11 w-full items-center justify-between rounded-folha px-2 text-left font-mono aria-[pressed=true]:bg-petroleo-claro"
              >
                <span>{a.caminho}</span>
                <span className="text-[13px] text-tinta-suave">versão {a.versao}</span>
              </button>
            </li>
          ))}
        </ul>
        {arquivo ? (
          <div className="rounded-folha border-2 border-linha p-4">
            <Markdown texto={arquivo.conteudo} tamanho="normal" />
          </div>
        ) : null}
      </div>
    );
  }

  if (aba === "conversa") {
    return (
      <div className="flex flex-col gap-3 p-5">
        {dados.conversa.length === 0 ? <p className="text-tinta-suave">A entrevista ainda não começou.</p> : null}
        <ol className="flex flex-col gap-2">
          {dados.conversa.map((m, i) => (
            <li key={i} className={`rounded-folha p-3 ${m.autor === "ia" ? "bg-petroleo-claro" : "border-2 border-linha"}`}>
              <p className="text-[13px] text-tinta-suave">
                {m.autor === "ia" ? "IA" : "Mesa"}, {hora(m.criadoEm)}
              </p>
              <p className="whitespace-pre-wrap">{m.texto}</p>
            </li>
          ))}
        </ol>
        {dados.contribuicoes.length ? (
          <>
            <h3 className="mt-2 font-bold">Envios dos celulares</h3>
            <ul className="flex flex-col gap-1">
              {dados.contribuicoes.map((c, i) => (
                <li key={i}>
                  Fase {c.fase}, {c.estado}: {c.texto}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    );
  }

  if (aba === "teste") {
    const t = dados.teste;
    if (!t) return <p className="p-5 text-tinta-suave">A mesa ainda não chegou ao teste cruzado.</p>;
    return (
      <div className="flex flex-col gap-4 p-5">
        <section>
          <h3 className="font-bold">Teste que esta mesa fez</h3>
          <p>
            {t.parceira ? `Testa a skill da ${t.parceira.nome}: ${resumoDoPlacar(t.rodada)}` : "Par ainda não formado."}
            {t.enviado ? ". Relatório enviado." : ""}
          </p>
        </section>
        <section>
          <h3 className="font-bold">Teste da skill desta mesa</h3>
          <p>
            {t.recebido
              ? `A ${t.recebido.testadora} enviou: ${resumoDoPlacar(t.recebido.rodada)}`
              : t.testadaPor
                ? `A ${t.testadaPor.nome} ainda não enviou o relatório.`
                : "Ninguém testa esta mesa ainda."}
          </p>
          {t.recebido?.rodada?.placar?.length ? (
            <ul className="mt-2 flex flex-col gap-1">
              {t.recebido.rodada.placar.map((p) => (
                <li key={p.id}>
                  {p.passou ? "Passou" : "Falhou"}: {p.descricao}
                  {p.observacao ? `. ${p.observacao}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <ol className="flex flex-col gap-2">
        {dados.linhaDoTempo.map((r, i) => (
          <li key={i} className="flex gap-3">
            <span className="numeros-tabulares w-12 shrink-0 text-tinta-suave">{hora(r.criadoEm)}</span>
            <span>
              {textoDoRegistro(r.acao, r.detalhes)}
              <span className="text-tinta-suave">
                {" "}
                ({r.autorNome || AUTOR[r.autorPerfil] || r.autorPerfil})
              </span>
            </span>
          </li>
        ))}
      </ol>
      {dados.chamados.length ? (
        <>
          <h3 className="font-bold">Pedidos de ajuda</h3>
          <ul className="flex flex-col gap-1">
            {dados.chamados.map((c, i) => (
              <li key={i}>
                {hora(c.abertoEm)}, Fase {c.fase}, passo {c.passo}:{" "}
                {c.estado === "atendido" ? `atendido por ${c.atendidoPor} às ${hora(c.atendidoEm!)}` : c.estado}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
