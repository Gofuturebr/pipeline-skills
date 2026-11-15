"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { enviar, useEstadoRemoto } from "@/lib/cliente/estado-remoto";
import { useAgora } from "@/lib/cliente/relogio";
import { canalEvento, canalMesa } from "@/lib/sinais";
import type { EstadoMesaApi } from "@/lib/tipos-api";
import { Botao } from "@/components/base/Botao";
import { ContagemAte, CronometroEvento } from "@/components/base/Cronometro";
import { Faixa } from "@/components/base/Faixa";
import { Icone } from "@/components/base/Icone";
import { IndicadorConexao } from "@/components/base/Selo";
import { FolhaDeTrabalho } from "./FolhaDeTrabalho";
import { PastaViva } from "./PastaViva";
import { VisualizadorDeArquivo } from "./VisualizadorDeArquivo";
import { Trilha } from "./Trilha";

const VIDA_AVISO_MS = 60_000;

export function TelaMesa({ codigo, enderecoParticipante }: { codigo: string; enderecoParticipante: string }) {
  const remoto = useEstadoRemoto<EstadoMesaApi>(`/api/mesa/${encodeURIComponent(codigo)}/estado`, (d) =>
    d ? [canalMesa(d.mesa.id), canalEvento(d.evento.id)] : [],
  );
  const { dados: estado, erro, conexao, defasagem, substituir } = remoto;

  const [faseRevendo, setFaseRevendo] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState<{ chave: number; texto: string } | null>(null);
  const [avisosFechados, setAvisosFechados] = useState<Set<string>>(new Set());
  const [reabertaFechada, setReabertaFechada] = useState<string | null>(null);
  const [pastaAberta, setPastaAberta] = useState(false);
  const [faseRegistrada, setFaseRegistrada] = useState<number | null>(null);
  const [arquivoAberto, setArquivoAberto] = useState<string | null>(null);
  const agora = useAgora(defasagem);

  // A fase vem sempre do servidor. Quando ela muda, a tela volta para a fase
  // atual e, se avançou, mostra o anúncio de fase liberada.
  const faseAtual = estado?.mesa.faseAtual ?? null;
  if (estado && faseAtual !== null && faseAtual !== faseRegistrada) {
    setFaseRegistrada(faseAtual);
    setFaseRevendo(null);
    if (faseRegistrada !== null && faseAtual > faseRegistrada) {
      const f = estado.fases.find((x) => x.ordem === faseAtual);
      setAnuncio({ chave: faseAtual, texto: `Fase ${faseAtual} liberada: ${f?.nome ?? ""}` });
    }
  }

  useEffect(() => {
    if (!anuncio) return;
    const t = setTimeout(() => setAnuncio(null), 1200);
    return () => clearTimeout(t);
  }, [anuncio]);

  if (erro?.status === 404) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="font-titulo text-[40px] font-bold leading-[1.15]">
          Não encontramos esta mesa. Confira o código no cartão da mesa.
        </h1>
        <Link href="/" className="text-xl font-bold text-petroleo underline underline-offset-4">
          Digitar o código de novo
        </Link>
      </main>
    );
  }

  if (!estado) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-xl text-tinta-suave" aria-busy>
        {conexao === "sem_conexao"
          ? "Sem conexão. Tentando de novo."
          : erro
            ? `${erro.mensagem} Tentando de novo.`
            : "Abrindo a mesa"}
      </main>
    );
  }

  const { mesa, evento } = estado;
  const vista = faseRevendo ?? mesa.faseAtual;

  async function acao(url: string, corpo?: unknown): Promise<boolean> {
    setEnviando(true);
    setErroAcao(null);
    const r = await enviar<EstadoMesaApi>(url, corpo);
    setEnviando(false);
    if (!r.ok) {
      setErroAcao(r.mensagem);
      return false;
    }
    substituir(r.dados);
    return true;
  }

  const base = `/api/mesa/${encodeURIComponent(codigo)}`;
  const offline = conexao === "sem_conexao";

  const aviso = estado.avisos.find(
    (a) => !avisosFechados.has(a.id) && agora - Date.parse(a.criadoEm) < VIDA_AVISO_MS,
  );
  const reaberta =
    mesa.reabertaEm &&
    mesa.reabertaEm !== reabertaFechada &&
    Date.parse(mesa.reabertaEm) >= Date.parse(mesa.relogio.faseIniciadaEm) - 1000;

  // No teste cruzado, enquanto testa, a mesa vê a pasta da parceira em leitura (RN09).
  const passoAtual = estado.fases.find((f) => f.ordem === mesa.faseAtual)?.passos.find((p) => p.ordem === mesa.passoAtual);
  const vendoParceira =
    mesa.faseAtual === 5 &&
    Boolean(estado.teste?.liberado) &&
    ["rodar", "observar", "enviar"].includes(passoAtual?.chave ?? "");
  const arquivosNaPasta = vendoParceira ? (estado.teste?.pastaParceira ?? []) : estado.arquivos;
  const arquivoVisto = arquivoAberto ? (arquivosNaPasta.find((a) => a.caminho === arquivoAberto) ?? null) : null;
  const pastaViva = (
    <PastaViva
      nomeSkill={mesa.nomeSkill}
      arquivos={arquivosNaPasta}
      faseAtual={mesa.faseAtual}
      agora={agora}
      rotulo={vendoParceira ? `Pasta da ${estado.teste?.parceira?.nome ?? "parceira"}, somente leitura` : undefined}
      somenteLeitura={vendoParceira}
      aoAbrir={(c) => {
        setArquivoAberto(c);
        setPastaAberta(false);
      }}
    />
  );

  const pedirAjuda = estado.chamadoAberto ? (
    <div className="flex flex-col gap-2">
      <p className="inline-flex items-center gap-2 text-lg font-bold" role="status">
        <Icone nome="mao" className="h-6 w-6 text-estado-ajuda" />
        Ajuda a caminho
      </p>
      <Botao variante="discreto" disabled={offline} onClick={() => acao(`${base}/ajuda`, { abrir: false })}>
        Cancelar pedido
      </Botao>
    </div>
  ) : (
    <Botao
      variante="secundario"
      className="w-full text-lg"
      disabled={offline}
      motivo={offline ? "Sem conexão" : null}
      onClick={() => acao(`${base}/ajuda`, { abrir: true })}
    >
      Pedir ajuda
    </Botao>
  );

  return (
    <>
      {/* Abaixo de 1024 px a tela da mesa não cabe: orienta usar o notebook. */}
      <main className="flex min-h-dvh flex-col justify-center gap-4 px-4 py-10 min-[1024px]:hidden">
        <h1 className="font-titulo text-[26px] font-bold leading-tight">Esta é a tela do notebook da mesa.</h1>
        <p className="text-[17px] leading-normal">
          Abram este endereço no notebook. No celular, cada pessoa entra pelo QR que está no cartão da mesa.
        </p>
        <Link href={`/p/${codigo}`} className="text-[17px] font-bold text-petroleo underline underline-offset-4">
          Entrar como participante pelo celular
        </Link>
      </main>

      <div className="relative hidden h-dvh flex-col overflow-hidden min-[1024px]:flex">
        {offline ? (
          <Faixa tipo="conexao" icone="sem-sinal">
            Sem conexão. Continuem escrevendo, nada se perde.
          </Faixa>
        ) : null}
        {reaberta ? (
          <Faixa tipo="reaberta" aoFechar={() => setReabertaFechada(mesa.reabertaEm)}>
            O gestor reabriu a Fase {mesa.faseAtual}. Nada foi apagado.
          </Faixa>
        ) : null}

        <header className="flex h-16 shrink-0 items-center gap-6 border-b-2 border-linha bg-papel px-6">
          <h1 className="shrink-0 font-titulo text-[28px] font-bold">{mesa.nome}</h1>
          <p className="min-w-0 flex-1 truncate text-xl">{mesa.tarefa || mesa.processo || ""}</p>
          <IndicadorConexao estado={conexao} />
          <CronometroEvento iniciadoEm={evento.iniciadoEm} defasagem={defasagem} className="text-[32px]" />
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[240px_1fr] min-[1366px]:grid-cols-[240px_1fr_320px]">
          <aside className="min-h-0 border-r-2 border-linha bg-bancada">
            <Trilha
              estado={estado}
              defasagem={defasagem}
              faseVista={vista}
              aoVerFase={(o) => setFaseRevendo(o === mesa.faseAtual ? null : o)}
              aoIrParaPasso={(ordem) => {
                setFaseRevendo(null);
                if (ordem !== mesa.passoAtual) void acao(`${base}/passo/ir`, { ordem });
              }}
              pedirAjuda={pedirAjuda}
            />
          </aside>
          <section aria-label="Folha de trabalho" className="relative min-h-0 bg-papel shadow-folha">
            <FolhaDeTrabalho
              estado={estado}
              codigo={codigo}
              faseVista={vista}
              enviando={enviando}
              erroAcao={erroAcao}
              enderecoParticipante={enderecoParticipante}
              aoAgir={acao}
              aoSubstituir={substituir}
              aoVoltarAoAtual={() => {
                setFaseRevendo(null);
                const fase = estado.fases.find((f) => f.ordem === mesa.faseAtual);
                const aberto = fase?.passos.find((p) => !p.concluido);
                if (aberto && aberto.ordem !== mesa.passoAtual) void acao(`${base}/passo/ir`, { ordem: aberto.ordem });
              }}
              aoConcluirPasso={(passoId) => void acao(`${base}/passo/concluir`, { passoId })}
              aoConcluirFase={async (pendente) => {
                if (pendente && !(await acao(`${base}/passo/concluir`, { passoId: pendente }))) return;
                await acao(`${base}/fase/concluir`);
              }}
            />
            {arquivoVisto ? (
              <VisualizadorDeArquivo
                key={`${arquivoVisto.caminho}:${arquivoVisto.versao}`}
                arquivo={arquivoVisto}
                urlVersoes={vendoParceira ? null : `${base}/arquivos/versoes?caminho=${encodeURIComponent(arquivoVisto.caminho)}`}
                aoFechar={() => setArquivoAberto(null)}
              />
            ) : null}
          </section>
          <aside className="hidden min-h-0 border-l-2 border-linha bg-bancada min-[1366px]:block">
            {pastaViva}
          </aside>
        </div>

        {/* Entre 1024 e 1365 px, a Pasta viva recolhe numa aba lateral. */}
        <button
          type="button"
          onClick={() => setPastaAberta((v) => !v)}
          aria-expanded={pastaAberta}
          className="absolute right-0 top-1/2 min-h-11 -translate-y-1/2 rounded-l-[8px] border-2 border-r-0 border-pasta-sombra bg-pasta px-2 py-4 font-bold [writing-mode:vertical-rl] min-[1366px]:hidden"
        >
          {pastaAberta ? "Fechar pasta" : "Pasta"}
        </button>
        {pastaAberta ? (
          <div className="absolute bottom-0 right-10 top-16 w-[320px] border-l-2 border-linha bg-bancada shadow-lg min-[1366px]:hidden">
            {pastaViva}
          </div>
        ) : null}

        {aviso ? (
          <Faixa
            tipo="gestor"
            aoFechar={() => setAvisosFechados((s) => new Set(s).add(aviso.id))}
            className="shrink-0"
          >
            Aviso do gestor: {aviso.texto}
          </Faixa>
        ) : null}

        {mesa.estado === "pausada" ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-bancada px-10 text-center">
            <Icone nome="pausa" className="h-14 w-14 text-estado-pausada" />
            {evento.pausaGeralAte ? (
              <h2 className="font-titulo text-[40px] font-bold leading-[1.15]">
                Intervalo. Voltamos em <ContagemAte ate={evento.pausaGeralAte} defasagem={defasagem} />.
              </h2>
            ) : (
              <h2 className="font-titulo text-[40px] font-bold leading-[1.15]">
                Mesa pausada pelo gestor. Aguardem a retomada.
              </h2>
            )}
          </div>
        ) : null}

        <div aria-live="assertive" className="sr-only">
          {anuncio?.texto}
        </div>
        {anuncio ? (
          <div
            key={anuncio.chave}
            className="movimento-anuncio pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-petroleo"
          >
            <p className="px-10 text-center font-titulo text-[56px] font-bold leading-tight text-papel">
              {anuncio.texto}
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}
