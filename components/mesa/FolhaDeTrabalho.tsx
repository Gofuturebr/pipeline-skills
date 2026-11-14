"use client";

import { Botao } from "@/components/base/Botao";
import { SeloPapel } from "@/components/base/Selo";
import { Faixa } from "@/components/base/Faixa";
import { AtividadeDoPasso, FilaDeContribuicoes } from "@/components/atividades";
import type { EstadoMesaApi, FaseApi } from "@/lib/tipos-api";

// Folha de trabalho: cabeçalho com fase, passo e papel; a instrução do passo em
// corpo de título; a atividade; e o botão fixo no pé.

export function FolhaDeTrabalho({
  estado,
  codigo,
  faseVista,
  enviando,
  erroAcao,
  enderecoParticipante,
  aoAgir,
  aoVoltarAoAtual,
  aoConcluirPasso,
  aoConcluirFase,
}: {
  estado: EstadoMesaApi;
  codigo: string;
  faseVista: number;
  enviando: boolean;
  erroAcao: string | null;
  enderecoParticipante: string;
  aoAgir: (url: string, corpo?: unknown) => Promise<boolean>;
  aoVoltarAoAtual: () => void;
  aoConcluirPasso: (passoId: string) => void;
  aoConcluirFase: (passoIdPendente: string | null) => void;
}) {
  const { mesa } = estado;
  const fase = estado.fases.find((f) => f.ordem === faseVista);
  if (!fase) return null;

  if (fase.situacao === "concluida") {
    return (
      <FaseEmLeitura
        fase={fase}
        estado={estado}
        codigo={codigo}
        enderecoParticipante={enderecoParticipante}
        aoAgir={aoAgir}
        aoVoltarAoAtual={aoVoltarAoAtual}
      />
    );
  }

  if (mesa.estado === "pronta") {
    return (
      <div className="flex h-full flex-col gap-6 overflow-y-auto px-10 py-10">
        <h2 className="font-titulo text-[40px] font-bold leading-[1.15]">
          Fase concluída. Aguardando liberação.
        </h2>
        {fase.aprofundamento ? (
          <div className="max-w-[70ch] rounded-folha bg-papel p-6 shadow-folha">
            <h3 className="font-titulo text-[28px] font-semibold leading-tight">Enquanto isso, se quiserem</h3>
            <p className="mt-3 text-xl leading-normal">{fase.aprofundamento}</p>
          </div>
        ) : null}
      </div>
    );
  }

  const passos = fase.passos;
  const passo = passos.find((p) => p.ordem === mesa.passoAtual) ?? passos[0];
  if (!passo) return null;
  const ultimo = passo.ordem === passos[passos.length - 1]?.ordem;
  const outrosPendentes = passos.filter((p) => p.id !== passo.id && !p.concluido);

  let botao: React.ReactNode;
  if (ultimo && outrosPendentes.length === 0) {
    const podePasso = passo.concluido || passo.avaliacao.ok;
    // A fase só fecha com o critério da fase atendido; o último passo entra junto.
    const motivo = !podePasso
      ? (passo.avaliacao.falta ?? null)
      : estado.avaliacaoFase.ok || !passo.concluido
        ? null
        : (estado.avaliacaoFase.falta ?? null);
    botao = (
      <Botao
        variante="principal"
        tamanho="mesa"
        disabled={Boolean(motivo)}
        motivo={motivo}
        enviando={enviando}
        textoEnviando="Enviando"
        onClick={() => aoConcluirFase(passo.concluido ? null : passo.id)}
      >
        Concluímos a fase
      </Botao>
    );
  } else if (passo.concluido) {
    const proximo = outrosPendentes[0];
    botao = (
      <span className="inline-flex items-center gap-3 text-xl text-tinta-suave">
        Passo concluído.
        {proximo ? (
          <Botao variante="secundario" tamanho="mesa" onClick={aoVoltarAoAtual}>
            Ir para o passo {proximo.ordem}
          </Botao>
        ) : null}
      </span>
    );
  } else {
    botao = (
      <Botao
        variante="principal"
        tamanho="mesa"
        disabled={!passo.avaliacao.ok}
        motivo={passo.avaliacao.falta}
        enviando={enviando}
        textoEnviando="Enviando"
        onClick={() => aoConcluirPasso(passo.id)}
      >
        Passo concluído
      </Botao>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* A chave pelo passo faz a folha voltar ao topo quando o passo muda. */}
      <div key={passo.id} className="flex-1 overflow-y-auto px-10 pb-8 pt-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-base text-tinta-suave">
            Fase {fase.ordem}, passo {passo.ordem} de {passos.length}
          </p>
          <SeloPapel texto={passo.papelNome} tamanho="mesa" />
        </div>
        <h2 className="max-w-[28ch] font-titulo text-[40px] font-bold leading-[1.15]" aria-live="polite">
          {passo.instrucao}
        </h2>
        <div className="mt-8 flex max-w-[1100px] flex-col gap-10">
          <AtividadeDoPasso
            passo={passo}
            estado={estado}
            codigo={codigo}
            somenteLeitura={false}
            enderecoParticipante={enderecoParticipante}
            aoAgir={aoAgir}
          />
          {/* Nas fases que recebem envios do celular, a fila fica sempre à mão. */}
          {fase.recebeContribuicoes && passo.config.conteudo !== "contribuicoes" ? (
            <div className="border-t-2 border-linha pt-6">
              <FilaDeContribuicoes estado={estado} codigo={codigo} aoAgir={aoAgir} somenteLeitura={false} />
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex min-h-24 flex-wrap items-center justify-end gap-4 border-t-2 border-linha bg-papel px-10 py-4">
        {erroAcao ? (
          <p role="alert" className="mr-auto text-lg font-bold text-tinta">
            {erroAcao}
          </p>
        ) : null}
        {botao}
      </div>
    </div>
  );
}

function FaseEmLeitura({
  fase,
  estado,
  codigo,
  enderecoParticipante,
  aoAgir,
  aoVoltarAoAtual,
}: {
  fase: FaseApi;
  estado: EstadoMesaApi;
  codigo: string;
  enderecoParticipante: string;
  aoAgir: (url: string, corpo?: unknown) => Promise<boolean>;
  aoVoltarAoAtual: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <Faixa tipo="revendo">
        <span className="flex flex-wrap items-center justify-between gap-3">
          Vocês estão revendo a Fase {fase.ordem}.
          <Botao variante="secundario" onClick={aoVoltarAoAtual} className="text-base">
            Voltar ao passo atual
          </Botao>
        </span>
      </Faixa>
      <div className="flex-1 overflow-y-auto px-10 py-6">
        <h2 className="font-titulo text-[28px] font-bold leading-tight">
          Fase {fase.ordem}: {fase.nome}
        </h2>
        <ol className="mt-6 flex flex-col gap-8">
          {fase.passos.map((p) => (
            <li key={p.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-base text-tinta-suave">Passo {p.ordem}</p>
                <SeloPapel texto={p.papelNome} />
              </div>
              <p className="max-w-[70ch] text-xl leading-normal">{p.instrucao}</p>
              <AtividadeDoPasso
                passo={p}
                estado={estado}
                codigo={codigo}
                somenteLeitura
                enderecoParticipante={enderecoParticipante}
                aoAgir={aoAgir}
              />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
