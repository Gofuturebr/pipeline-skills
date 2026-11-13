"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { enviar, useEstadoRemoto } from "@/lib/cliente/estado-remoto";
import { useAgora } from "@/lib/cliente/relogio";
import { canalAdmin, canalEvento, type Sinal } from "@/lib/sinais";
import { pode, type Perfil } from "@/lib/permissoes";
import { estadoMostrado, segundosRestantesFase } from "@/lib/tempo";
import type { CartaoMesaApi, PainelApi } from "@/lib/tipos-api";
import { Botao } from "@/components/base/Botao";
import { Campo, CampoTexto } from "@/components/base/Campo";
import { ContagemAte, CronometroEvento } from "@/components/base/Cronometro";
import { Dialogo } from "@/components/base/Dialogo";
import { IndicadorConexao } from "@/components/base/Selo";
import { CartaoDaMesa, type AcaoCartao } from "./CartaoDaMesa";
import { GavetaDaMesa, type AcaoGaveta } from "./GavetaDaMesa";

type Filtro = "todas" | "ajuda" | "prontas" | "atrasadas";

type Confirmacao =
  | { tipo: "forcar"; mesa: CartaoMesaApi }
  | { tipo: "voltar"; mesa: CartaoMesaApi }
  | { tipo: "avancar_todas" }
  | { tipo: "pausar_todas" }
  | { tipo: "aviso_todas" };

interface Toast {
  id: number;
  texto: string;
  desfazerMesa?: string;
}

function tocarSom() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.frequency.value = 880;
    ganho.gain.setValueAtTime(0.15, ctx.currentTime);
    ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(ganho).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

function lerSomLigado(): boolean {
  try {
    return localStorage.getItem("mesa:som") !== "desligado";
  } catch {
    return true;
  }
}

export function PainelAdmin({ perfil, nome, mesaInicial }: { perfil: Perfil; nome: string; mesaInicial?: string }) {
  const router = useRouter();
  const aoSinalRef = useRef<(s: Sinal) => boolean>(() => false);
  const remoto = useEstadoRemoto<PainelApi>(
    "/api/admin/painel",
    (d) => (d ? [canalAdmin(d.evento.id), canalEvento(d.evento.id)] : []),
    { aoSinal: (s) => aoSinalRef.current(s) },
  );
  const { dados: painel, erro, conexao, defasagem, recarregar, modificar } = remoto;

  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [mesaAberta, setMesaAberta] = useState<string | null>(mesaInicial ?? null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  // O painel só aparece depois da primeira busca, então ler o navegador aqui
  // não causa diferença com o HTML do servidor.
  const [somLigado, setSomLigado] = useState(() => (typeof window === "undefined" ? true : lerSomLigado()));
  const [pulsando, setPulsando] = useState<Set<string>>(new Set());
  const [textoAviso, setTextoAviso] = useState("");
  const [minutosPausa, setMinutosPausa] = useState("");
  const ajudaAnterior = useRef<Set<string> | null>(null);
  const agora = useAgora(defasagem);

  // Atualiza só o cartão da mesa que mudou.
  const atualizarCartao = useCallback(
    async (mesaId: string) => {
      try {
        const r = await fetch(`/api/admin/mesas/${mesaId}`, { cache: "no-store" });
        if (!r.ok) return recarregar();
        const cartao = (await r.json()) as CartaoMesaApi;
        modificar((p) => ({ ...p, mesas: p.mesas.map((m) => (m.id === cartao.id ? cartao : m)) }));
      } catch {
        recarregar();
      }
    },
    [modificar, recarregar],
  );

  useEffect(() => {
    aoSinalRef.current = (s: Sinal) => {
      if (s.mesaId && s.tipo !== "evento") {
        void atualizarCartao(s.mesaId);
        return true;
      }
      return false;
    };
  }, [atualizarCartao]);

  // Pediu ajuda: pulsa uma vez e toca um som curto quando chega.
  useEffect(() => {
    if (!painel) return;
    const atuais = new Set(painel.mesas.filter((m) => m.pediuAjuda).map((m) => m.id));
    const anteriores = ajudaAnterior.current;
    ajudaAnterior.current = atuais;
    if (!anteriores) return;
    const novas = [...atuais].filter((id) => !anteriores.has(id));
    if (novas.length === 0) return;
    setPulsando(new Set(novas));
    if (somLigado) tocarSom();
    const t = setTimeout(() => setPulsando(new Set()), 1000);
    return () => clearTimeout(t);
  }, [painel, somLigado]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const abrirMesa = useCallback((id: string) => {
    setMesaAberta(id);
    window.history.pushState(null, "", `/admin/mesa/${id}`);
  }, []);

  const fecharMesa = useCallback(() => {
    setMesaAberta(null);
    window.history.pushState(null, "", "/admin");
  }, []);

  useEffect(() => {
    const aoVoltar = () => {
      const m = window.location.pathname.match(/^\/admin\/mesa\/([0-9a-f-]{36})$/);
      setMesaAberta(m ? m[1] : null);
    };
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, []);

  const chamar = useCallback(
    async (url: string, corpo?: unknown, metodo: "POST" | "PUT" = "POST"): Promise<boolean> => {
      setEnviando(true);
      setErroAcao(null);
      const r = await enviar(url, corpo, metodo);
      setEnviando(false);
      if (!r.ok) {
        setErroAcao(r.mensagem);
        return false;
      }
      return true;
    },
    [],
  );

  const acaoMesa = useCallback(
    async (mesa: CartaoMesaApi, acao: string, corpo?: unknown) => {
      const ok = await chamar(`/api/admin/mesas/${mesa.id}/${acao}`, corpo);
      if (ok) void atualizarCartao(mesa.id);
      return ok;
    },
    [chamar, atualizarCartao],
  );

  const avancarPronta = useCallback(
    async (mesa: CartaoMesaApi) => {
      if (await acaoMesa(mesa, "avancar")) {
        setToast({ id: Date.now(), texto: `${mesa.nome} avançou para a Fase ${mesa.faseAtual + 1}.`, desfazerMesa: mesa.id });
      }
    },
    [acaoMesa],
  );

  const atender = useCallback(
    async (mesa: CartaoMesaApi) => {
      if (!mesa.chamadoId) return false;
      const ok = await chamar(`/api/admin/chamados/${mesa.chamadoId}/atender`);
      if (ok) void atualizarCartao(mesa.id);
      return ok;
    },
    [chamar, atualizarCartao],
  );

  const aoAgirCartao = useCallback(
    (mesa: CartaoMesaApi, acao: AcaoCartao) => {
      if (acao === "avancar") void avancarPronta(mesa);
      else if (acao === "forcar") setConfirmacao({ tipo: "forcar", mesa });
      else if (acao === "atender") void atender(mesa);
      else void acaoMesa(mesa, "retomar");
    },
    [avancarPronta, atender, acaoMesa],
  );

  const contagens = useMemo(() => {
    const c = { todas: 0, ajuda: 0, prontas: 0, atrasadas: 0, porFase: new Array(8).fill(0) as number[] };
    if (!painel) return c;
    for (const m of painel.mesas) {
      const e = estadoMostrado(m.estado, segundosRestantesFase(m.relogio, m.relogio.duracaoMin, agora));
      c.todas++;
      if (m.pediuAjuda) c.ajuda++;
      if (e === "pronta") c.prontas++;
      if (e === "atrasada") c.atrasadas++;
      c.porFase[m.faseAtual]++;
    }
    return c;
  }, [painel, agora]);

  useEffect(() => {
    if (erro?.status === 401) router.replace("/admin/entrar");
  }, [erro, router]);

  if (!painel) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-[15px] text-tinta-suave">
        {erro ? erro.mensagem : "Abrindo o painel"}
      </main>
    );
  }

  const { evento } = painel;
  const nomeFase = (ordem: number) => painel.fases.find((f) => f.ordem === ordem)?.nome ?? "";
  const ref = evento.faseReferencia;
  const naRef = painel.mesas.filter((m) => m.faseAtual === ref);
  const naRefNaoConcluidas = naRef.filter((m) => m.estado !== "pronta").length;
  const prontasParaAvancar = painel.mesas.filter((m) => m.estado === "pronta" && m.faseAtual < 7).length;
  const maxPorFase = Math.max(1, ...contagens.porFase);

  const filtradas = painel.mesas.filter((m) => {
    const e = estadoMostrado(m.estado, segundosRestantesFase(m.relogio, m.relogio.duracaoMin, agora));
    if (filtro === "ajuda") return m.pediuAjuda;
    if (filtro === "prontas") return e === "pronta";
    if (filtro === "atrasadas") return e === "atrasada";
    return true;
  });
  // No celular, a lista vem ordenada por Pediu ajuda, Prontas e depois as demais.
  const peso = (m: CartaoMesaApi) => (m.pediuAjuda ? 0 : m.estado === "pronta" ? 1 : 2);
  const ordenadasCelular = [...filtradas].sort((a, b) => peso(a) - peso(b) || a.numero - b.numero);

  const mesaDaGaveta = painel.mesas.find((m) => m.id === mesaAberta) ?? null;
  const gestor = perfil === "gestor";
  const dataEvento = evento.data.split("-").reverse().slice(0, 2).join("/");

  async function confirmar() {
    if (!confirmacao) return;
    let ok = false;
    switch (confirmacao.tipo) {
      case "forcar":
        ok = await acaoMesa(confirmacao.mesa, "forcar");
        break;
      case "voltar":
        ok = await acaoMesa(confirmacao.mesa, "voltar");
        break;
      case "avancar_todas":
        ok = await chamar("/api/admin/todas/avancar-todas");
        if (ok) recarregar();
        break;
      case "pausar_todas": {
        const minutos = minutosPausa.trim() ? Number(minutosPausa) : undefined;
        ok = await chamar("/api/admin/todas/pausar", { minutos });
        if (ok) recarregar();
        break;
      }
      case "aviso_todas":
        ok = await chamar("/api/admin/todas/aviso", { texto: textoAviso });
        if (ok) setTextoAviso("");
        break;
    }
    if (ok) setConfirmacao(null);
  }

  async function agirNaGaveta(acao: AcaoGaveta): Promise<boolean> {
    if (!mesaDaGaveta) return false;
    switch (acao.tipo) {
      case "avancar":
        await avancarPronta(mesaDaGaveta);
        return true;
      case "forcar":
      case "voltar":
        setConfirmacao({ tipo: acao.tipo, mesa: mesaDaGaveta });
        return true;
      case "atender":
        return atender(mesaDaGaveta);
      case "tempo":
        return acaoMesa(mesaDaGaveta, "tempo", { minutos: acao.minutos });
      case "aviso":
        return acaoMesa(mesaDaGaveta, "aviso", { texto: acao.texto });
      default:
        return acaoMesa(mesaDaGaveta, acao.tipo);
    }
  }

  const chips: { chave: Filtro; texto: string; n: number }[] = [
    { chave: "todas", texto: "Todas", n: contagens.todas },
    { chave: "ajuda", texto: "Pediu ajuda", n: contagens.ajuda },
    { chave: "prontas", texto: "Prontas", n: contagens.prontas },
    { chave: "atrasadas", texto: "Atrasadas", n: contagens.atrasadas },
  ];

  return (
    <div className="flex min-h-dvh flex-col text-[15px] min-[1280px]:h-dvh min-[1280px]:overflow-hidden">
      {/* Barra superior */}
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b-2 border-linha bg-papel px-4 py-2">
        <h1 className="font-titulo text-[22px] font-bold">
          {evento.nome.replace("Oficina de Criação de Skills ", "")} {dataEvento}
        </h1>
        <span className="flex items-center gap-2">
          Tempo do evento
          {evento.iniciadoEm || !gestor ? (
            <CronometroEvento iniciadoEm={evento.iniciadoEm} defasagem={defasagem} className="text-[20px]" />
          ) : (
            <Botao variante="principal" onClick={() => chamar("/api/admin/evento", { iniciar: true }, "PUT").then((ok) => ok && recarregar())}>
              Iniciar evento
            </Botao>
          )}
        </span>
        {evento.pausaGeralAte ? (
          <span className="flex items-center gap-2 font-bold">
            Intervalo, faltam <ContagemAte ate={evento.pausaGeralAte} defasagem={defasagem} className="text-[20px]" />
          </span>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <IndicadorConexao estado={conexao} />
          {gestor ? (
            <>
              <Botao
                variante="discreto"
                onClick={() =>
                  chamar(
                    "/api/admin/evento",
                    { modoLiberacao: evento.modoLiberacao === "manual" ? "automatico" : "manual" },
                    "PUT",
                  ).then((ok) => ok && recarregar())
                }
                aria-label={`Modo de liberação ${evento.modoLiberacao === "manual" ? "manual" : "automático"}. Trocar.`}
              >
                Liberação {evento.modoLiberacao === "manual" ? "manual" : "automática"}
              </Botao>
              {evento.pausaGeralAte ? (
                <Botao variante="secundario" onClick={() => chamar("/api/admin/todas/retomar").then((ok) => ok && recarregar())}>
                  Retomar todas
                </Botao>
              ) : (
                <Botao variante="secundario" onClick={() => setConfirmacao({ tipo: "pausar_todas" })}>
                  Pausar todas
                </Botao>
              )}
              <Botao variante="secundario" onClick={() => setConfirmacao({ tipo: "aviso_todas" })}>
                Enviar aviso
              </Botao>
            </>
          ) : null}
          <Botao
            variante="discreto"
            onClick={() => {
              const novo = !somLigado;
              setSomLigado(novo);
              try {
                localStorage.setItem("mesa:som", novo ? "ligado" : "desligado");
              } catch {}
            }}
          >
            Som {somLigado ? "ligado" : "desligado"}
          </Botao>
          <span className="text-[13px] text-tinta-suave">
            {nome}, {perfil === "gestor" ? "gestor" : "facilitador"}
          </span>
          <Botao
            variante="discreto"
            onClick={async () => {
              await enviar("/api/admin/sair");
              router.replace("/admin/entrar");
            }}
          >
            Sair
          </Botao>
        </div>
      </header>

      {/* Barra de fases */}
      <section aria-label="Fases" className="sticky top-0 z-10 flex flex-col gap-2 border-b-2 border-linha bg-bancada px-4 py-3 min-[1280px]:static">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {gestor ? (
            <label className="flex items-center gap-2 font-bold">
              Fase de referência
              <select
                value={ref}
                onChange={(e) => chamar("/api/admin/evento", { faseReferencia: Number(e.target.value) }, "PUT").then((ok) => ok && recarregar())}
                className="min-h-11 rounded-folha border-2 border-linha bg-papel px-2 font-bold"
              >
                {painel.fases.map((f) => (
                  <option key={f.ordem} value={f.ordem}>
                    {f.ordem} {f.nome}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="font-bold">
              Fase de referência: {ref} {nomeFase(ref)}
            </p>
          )}
          {gestor ? (
            <span className="flex items-center gap-2">
              Tempo de todas as mesas
              <Botao variante="secundario" onClick={() => chamar("/api/admin/todas/tempo", { minutos: 5 })}>
                +5 min
              </Botao>
              <Botao variante="secundario" onClick={() => chamar("/api/admin/todas/tempo", { minutos: -5 })}>
                -5 min
              </Botao>
            </span>
          ) : null}
          {gestor ? (
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <Botao
                variante="principal"
                disabled={prontasParaAvancar === 0}
                motivo={prontasParaAvancar === 0 ? "Nenhuma mesa pronta" : null}
                enviando={enviando}
                textoEnviando="Avançando"
                onClick={() => chamar("/api/admin/todas/avancar-prontas").then((ok) => ok && recarregar())}
              >
                {prontasParaAvancar === 1 ? "Avançar a mesa pronta" : `Avançar as ${prontasParaAvancar} mesas prontas`}
              </Botao>
              <Botao
                variante="secundario"
                disabled={naRef.length === 0 || ref >= 7}
                motivo={ref >= 7 ? "Última fase" : naRef.length === 0 ? "Nenhuma mesa na fase de referência" : null}
                onClick={() => setConfirmacao({ tipo: "avancar_todas" })}
              >
                Avançar todas
              </Botao>
            </div>
          ) : null}
        </div>
        <ol className="grid grid-cols-8 gap-2" aria-label="Mesas em cada fase">
          {painel.fases.map((f) => (
            <li
              key={f.ordem}
              className={`flex flex-col gap-1 rounded-folha border-2 px-2 py-1 ${
                f.ordem === ref ? "border-petroleo bg-petroleo-claro" : "border-transparent"
              }`}
            >
              <span className="truncate text-[13px]">
                <span className="font-bold">{f.ordem}</span> {f.nomeCurto}
              </span>
              <span className="flex items-center gap-2">
                <span aria-hidden className="h-3 rounded-sm bg-petroleo" style={{ width: `${(contagens.porFase[f.ordem] / maxPorFase) * 100}%`, minWidth: contagens.porFase[f.ordem] ? 6 : 0 }} />
                <span className="numeros-tabulares font-bold">{contagens.porFase[f.ordem]}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2" role="group" aria-label="Mostrar">
        <span className="text-tinta-suave">Mostrar:</span>
        {chips.map((c) => (
          <button
            key={c.chave}
            type="button"
            aria-pressed={filtro === c.chave}
            onClick={() => setFiltro(c.chave)}
            className={`min-h-11 rounded-full border-2 px-4 font-bold ${
              filtro === c.chave ? "border-petroleo bg-petroleo text-papel" : "border-linha bg-papel text-tinta"
            }`}
          >
            {c.texto} {c.n}
          </button>
        ))}
        {erroAcao ? (
          <p role="alert" className="ml-auto font-bold text-tinta">
            {erroAcao}
          </p>
        ) : null}
      </div>

      {/* Grade de mesas: posição fixa por número. */}
      <main className="min-h-0 flex-1 px-4 pb-4">
        <div className="hidden gap-3 min-[768px]:grid min-[768px]:grid-cols-3 min-[1280px]:grid-cols-5">
          {filtradas.map((m) => (
            <CartaoDaMesa
              key={m.id}
              mesa={m}
              defasagem={defasagem}
              pulsar={pulsando.has(m.id)}
              podeFase={pode(perfil, "avancar")}
              podePausar={pode(perfil, "retomar")}
              aoAbrir={abrirMesa}
              aoAgir={aoAgirCartao}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3 min-[768px]:hidden">
          {ordenadasCelular.map((m) => (
            <CartaoDaMesa
              key={m.id}
              mesa={m}
              defasagem={defasagem}
              pulsar={pulsando.has(m.id)}
              podeFase={pode(perfil, "avancar")}
              podePausar={pode(perfil, "retomar")}
              aoAbrir={abrirMesa}
              aoAgir={aoAgirCartao}
            />
          ))}
        </div>
        {filtradas.length === 0 ? <p className="py-8 text-tinta-suave">Nenhuma mesa neste filtro.</p> : null}
      </main>

      {mesaDaGaveta ? (
        <GavetaDaMesa
          mesa={mesaDaGaveta}
          nomeFase={nomeFase}
          defasagem={defasagem}
          perfil={perfil}
          enviando={enviando}
          aoFechar={fecharMesa}
          aoAgir={agirNaGaveta}
        />
      ) : null}

      {toast ? (
        <div role="status" className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-folha bg-tinta px-5 py-3 text-papel">
          {toast.texto}
          {toast.desfazerMesa ? (
            <button
              type="button"
              className="min-h-11 rounded-botao px-3 font-bold underline underline-offset-4"
              onClick={async () => {
                const id = toast.desfazerMesa as string;
                setToast(null);
                if (await chamar(`/api/admin/mesas/${id}/desfazer`)) void atualizarCartao(id);
              }}
            >
              Desfazer
            </button>
          ) : null}
        </div>
      ) : null}

      <Dialogo
        aberto={confirmacao?.tipo === "forcar"}
        titulo={
          confirmacao?.tipo === "forcar"
            ? `A ${confirmacao.mesa.nome} ainda não concluiu a Fase ${confirmacao.mesa.faseAtual}. Avançar mesmo assim?`
            : ""
        }
        textoConfirmar="Avançar mesmo assim"
        textoEnviando="Avançando"
        enviando={enviando}
        aoConfirmar={confirmar}
        aoCancelar={() => setConfirmacao(null)}
      >
        {confirmacao?.tipo === "forcar" && confirmacao.mesa.faltaNaFase ? (
          <p>Pendente: {confirmacao.mesa.faltaNaFase}. O avanço forçado fica registrado.</p>
        ) : (
          <p>O avanço forçado fica registrado.</p>
        )}
      </Dialogo>

      <Dialogo
        aberto={confirmacao?.tipo === "voltar"}
        titulo={
          confirmacao?.tipo === "voltar"
            ? `A ${confirmacao.mesa.nome} volta para a Fase ${confirmacao.mesa.faseAtual - 1}. Nada será apagado.`
            : ""
        }
        textoConfirmar="Voltar fase"
        textoEnviando="Voltando"
        enviando={enviando}
        aoConfirmar={confirmar}
        aoCancelar={() => setConfirmacao(null)}
      />

      <Dialogo
        aberto={confirmacao?.tipo === "avancar_todas"}
        titulo={`Avançar todas as mesas da Fase ${ref}?`}
        textoConfirmar="Avançar todas"
        textoEnviando="Avançando"
        enviando={enviando}
        aoConfirmar={confirmar}
        aoCancelar={() => setConfirmacao(null)}
      >
        <p>
          {naRef.length === 1 ? "1 mesa está" : `${naRef.length} mesas estão`} na Fase {ref}.{" "}
          {naRefNaoConcluidas === 0
            ? "Todas concluíram."
            : naRefNaoConcluidas === 1
              ? "1 ainda não concluiu e vai avançar mesmo assim."
              : `${naRefNaoConcluidas} ainda não concluíram e vão avançar mesmo assim.`}{" "}
          Mesas em outras fases não mudam. A fase de referência passa para a Fase {ref + 1}.
        </p>
      </Dialogo>

      <Dialogo
        aberto={confirmacao?.tipo === "pausar_todas"}
        titulo="Pausar todas as mesas para o intervalo?"
        textoConfirmar="Pausar todas"
        textoEnviando="Pausando"
        enviando={enviando}
        aoConfirmar={confirmar}
        aoCancelar={() => setConfirmacao(null)}
      >
        <Campo
          rotulo="Minutos de intervalo"
          inputMode="numeric"
          placeholder={String(evento.duracaoIntervaloMin)}
          value={minutosPausa}
          onChange={(e) => setMinutosPausa(e.target.value.replace(/\D/g, ""))}
          ajuda={`Se ficar vazio, vale ${evento.duracaoIntervaloMin} minutos. O cronômetro das fases para.`}
        />
      </Dialogo>

      <Dialogo
        aberto={confirmacao?.tipo === "aviso_todas"}
        titulo="Enviar aviso para todas as mesas"
        textoConfirmar="Enviar aviso"
        textoEnviando="Enviando"
        enviando={enviando}
        aoConfirmar={confirmar}
        aoCancelar={() => setConfirmacao(null)}
      >
        <CampoTexto
          rotulo="Aviso"
          value={textoAviso}
          maxLength={280}
          onChange={(e) => setTextoAviso(e.target.value)}
          ajuda={`${textoAviso.length} de 280 caracteres`}
        />
      </Dialogo>
    </div>
  );
}
