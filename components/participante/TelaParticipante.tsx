"use client";

import { useEffect, useState } from "react";
import { enviar, useEstadoRemoto } from "@/lib/cliente/estado-remoto";
import { guardarRascunho, lerRascunho } from "@/lib/cliente/rascunho";
import { useAgora } from "@/lib/cliente/relogio";
import { LIMITE_CONTRIBUICAO, LIMITE_NOME } from "@/lib/participante";
import { canalEvento, canalMesa } from "@/lib/sinais";
import type { EstadoCelularApi } from "@/lib/tipos-api";
import { Botao } from "@/components/base/Botao";
import { ContagemAte, CronometroFase } from "@/components/base/Cronometro";
import { Campo } from "@/components/base/Campo";
import { Faixa } from "@/components/base/Faixa";
import { Icone } from "@/components/base/Icone";
import { IndicadorConexao, SeloPapel } from "@/components/base/Selo";

// Celular do participante (docs/frontend.md, seção 6): uma única tela que muda
// com a fase. A pessoa vê onde a mesa está e o seu papel, e só escreve quando a
// fase pede. Voz: "você".

const CHAVE_NOME = "mesa:nome";
const VIDA_AVISO_MS = 60_000;

export function TelaParticipante({ codigo }: { codigo: string }) {
  const base = `/api/p/${encodeURIComponent(codigo)}`;
  const remoto = useEstadoRemoto<EstadoCelularApi>(`${base}/estado`, (d) =>
    d ? [canalMesa(d.mesa.id), canalEvento(d.evento.id)] : [],
  );
  const { dados: estado, erro, conexao, defasagem, substituir } = remoto;
  const [faseRegistrada, setFaseRegistrada] = useState<number | null>(null);
  const [anuncio, setAnuncio] = useState<{ chave: number; texto: string } | null>(null);
  const [avisoFechado, setAvisoFechado] = useState<string | null>(null);
  const agora = useAgora(defasagem);

  // Mudança de fase atualiza a tela sozinha e mostra o anúncio de fase liberada.
  const faseAtual = estado?.mesa.faseAtual ?? null;
  if (estado && faseAtual !== null && faseAtual !== faseRegistrada) {
    setFaseRegistrada(faseAtual);
    if (faseRegistrada !== null && faseAtual > faseRegistrada) {
      setAnuncio({ chave: faseAtual, texto: `Fase ${faseAtual} liberada: ${estado.mesa.faseNome}` });
    }
  }
  useEffect(() => {
    if (!anuncio) return;
    const t = setTimeout(() => setAnuncio(null), 1200);
    return () => clearTimeout(t);
  }, [anuncio]);

  if (erro?.status === 404) {
    return (
      <Centro>
        <h1 className="font-titulo text-[26px] font-bold leading-tight">
          Não encontramos esta mesa. Leia de novo o QR do cartão da mesa.
        </h1>
      </Centro>
    );
  }
  if (!estado) {
    return (
      <Centro>
        <p className="text-[17px] text-tinta-suave" aria-busy>
          {conexao === "sem_conexao" ? "Sem conexão. Tentando de novo." : erro ? erro.mensagem : "Abrindo a mesa"}
        </p>
      </Centro>
    );
  }

  if (!estado.participante) {
    return <Entrada base={base} nomeMesa={estado.mesa.nome} aoEntrar={substituir} />;
  }

  const { mesa, participante } = estado;
  const aviso = estado.avisos.find((a) => a.id !== avisoFechado && agora - Date.parse(a.criadoEm) < VIDA_AVISO_MS);
  const pausada = mesa.estado === "pausada";

  return (
    <div className="mx-auto flex min-h-dvh max-w-[560px] flex-col text-[17px]">
      {conexao === "sem_conexao" ? (
        <Faixa tipo="conexao" icone="sem-sinal" className="text-[17px]">
          Sem conexão. Tentando de novo.
        </Faixa>
      ) : null}
      {aviso ? (
        <Faixa tipo="gestor" aoFechar={() => setAvisoFechado(aviso.id)} className="text-[17px]">
          Aviso do gestor: {aviso.texto}
        </Faixa>
      ) : null}

      <header className="flex flex-col gap-1 border-b-2 border-linha bg-papel px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-titulo text-[22px] font-bold">{mesa.nome}</h1>
          <span className="font-bold">Fase {mesa.faseAtual}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>{mesa.faseNome}</span>
          {pausada ? null : <CronometroFase relogio={mesa.relogio} defasagem={defasagem} className="text-[20px]" />}
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 py-4">
        {pausada ? (
          <Cartao>
            <p className="inline-flex items-center gap-2 font-titulo text-[22px] font-bold">
              <Icone nome="pausa" className="h-7 w-7 text-estado-pausada" />
              {estado.evento.pausaGeralAte ? (
                <span>
                  Intervalo. Voltamos em <ContagemAte ate={estado.evento.pausaGeralAte} defasagem={defasagem} />.
                </span>
              ) : (
                "Mesa pausada pelo gestor."
              )}
            </p>
          </Cartao>
        ) : null}

        <Cartao titulo={participante.papeis.length > 1 ? "Seus papéis" : "Seu papel"}>
          {participante.papeis.length === 0 ? (
            <p className="text-tinta-suave">A mesa ainda vai distribuir os papéis. Olhe a tela do notebook.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {participante.papeis.map((p) => (
                <li key={p.papel} className="flex flex-col gap-1">
                  <span className="font-titulo text-[22px] font-bold">{p.nome}</span>
                  <span className="leading-normal">{p.descricao}</span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        {!pausada && mesa.passo ? (
          <Cartao titulo={mesa.estado === "pronta" ? "A mesa concluiu a fase" : "A mesa está fazendo"}>
            {mesa.estado === "pronta" ? (
              <p className="leading-normal">Agora é esperar a liberação da próxima fase.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-tinta-suave">
                  Passo {mesa.passoAtual} de {mesa.totalPassos}
                </p>
                <p className="text-[19px] leading-snug">{mesa.passo.instrucao}</p>
                <span>
                  <SeloPapel texto={mesa.passo.papelNome} />
                </span>
              </div>
            )}
          </Cartao>
        ) : null}

        {estado.teste && !pausada ? (
          <Cartao titulo="Teste cruzado">
            <p className="text-[19px] leading-snug">Vocês estão testando a skill da {estado.teste.parceira}.</p>
            {estado.teste.total > 0 ? (
              <p className="font-titulo text-[24px] font-bold">
                Placar: {estado.teste.passaram} de {estado.teste.total} passaram
              </p>
            ) : null}
          </Cartao>
        ) : null}

        {estado.mesa.faseAtual === 7 ? (
          <Cartao titulo="Levar a skill">
            {estado.download ? (
              <div className="flex flex-col gap-3">
                <a
                  href={estado.download.url}
                  className="inline-flex min-h-12 items-center justify-center rounded-botao border-2 border-petroleo bg-petroleo px-5 text-[17px] font-bold text-papel"
                >
                  Baixar a pasta
                </a>
                <ol className="flex list-decimal flex-col gap-2 pl-5 leading-normal">
                  <li>No claude.ai, em Configurações, Capacidades, ligue a execução de código e criação de arquivos.</li>
                  <li>Abra Personalizar, Skills, toque em +, Criar skill e Enviar uma skill. Escolha o arquivo baixado, sem descompactar.</li>
                  <li>Ligue a skill e peça a tarefa com as palavras da seção Quando usar.</li>
                </ol>
              </div>
            ) : (
              <p className="leading-normal">Quando a mesa marcar a skill como final, o botão de baixar aparece aqui.</p>
            )}
          </Cartao>
        ) : null}

        {estado.perguntaAtual && !pausada ? (
          <Cartao titulo="A mesa está respondendo">
            <p className="font-titulo text-[22px] font-bold leading-snug">{estado.perguntaAtual}</p>
          </Cartao>
        ) : null}

        {estado.ficha && (estado.ficha.objetivo || estado.ficha.resultadoEsperado) ? (
          <Cartao titulo="O processo da mesa">
            <dl className="flex flex-col gap-2">
              {estado.ficha.objetivo ? (
                <div>
                  <dt className="text-sm font-bold text-tinta-suave">Objetivo</dt>
                  <dd className="leading-normal">{estado.ficha.objetivo}</dd>
                </div>
              ) : null}
              {estado.ficha.resultadoEsperado ? (
                <div>
                  <dt className="text-sm font-bold text-tinta-suave">Resultado esperado</dt>
                  <dd className="leading-normal">{estado.ficha.resultadoEsperado}</dd>
                </div>
              ) : null}
            </dl>
          </Cartao>
        ) : null}

        {estado.contribuicao && !pausada ? (
          <Contribuir
            base={base}
            codigo={codigo}
            rotulo={estado.contribuicao.rotulo}
            enviadas={estado.contribuicao.enviadas}
            aceitas={estado.contribuicao.aceitas}
            offline={conexao === "sem_conexao"}
            aoEnviar={substituir}
          />
        ) : null}
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-linha px-4 py-3 text-[15px]">
        <span>
          Você entrou como <strong>{participante.nome}</strong>.
        </span>
        <IndicadorConexao estado={conexao} />
        <button
          type="button"
          className="min-h-11 font-bold text-petroleo underline underline-offset-4"
          onClick={async () => {
            const r = await enviar<EstadoCelularApi>(`${base}/sair`);
            if (r.ok) substituir(r.dados);
          }}
        >
          Não é você? Trocar o nome
        </button>
      </footer>

      <div aria-live="assertive" className="sr-only">
        {anuncio?.texto}
      </div>
      {anuncio ? (
        <div
          key={anuncio.chave}
          className="movimento-anuncio pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-petroleo px-6"
        >
          <p className="text-center font-titulo text-[32px] font-bold leading-tight text-papel">{anuncio.texto}</p>
        </div>
      ) : null}
    </div>
  );
}

function Centro({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center gap-4 px-4">{children}</main>;
}

function Cartao({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-folha border-2 border-linha bg-papel p-4">
      {titulo ? <h2 className="text-[15px] font-bold text-tinta-suave">{titulo}</h2> : null}
      {children}
    </section>
  );
}

function Entrada({
  base,
  nomeMesa,
  aoEntrar,
}: {
  base: string;
  nomeMesa: string;
  aoEntrar: (e: EstadoCelularApi) => void;
}) {
  const [nome, setNome] = useState(() => lerRascunho(CHAVE_NOME) ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setErro("Digite seu primeiro nome.");
      return;
    }
    setEnviando(true);
    setErro(null);
    const r = await enviar<EstadoCelularApi>(`${base}/entrar`, { nome });
    setEnviando(false);
    if (!r.ok) {
      setErro(r.mensagem);
      return;
    }
    guardarRascunho(CHAVE_NOME, nome.trim());
    aoEntrar(r.dados);
  }

  return (
    <Centro>
      <h1 className="font-titulo text-[28px] font-bold leading-tight">{nomeMesa}</h1>
      <p className="text-[17px] leading-normal">
        Digite só o seu primeiro nome. Ele aparece para a sua mesa na tela do notebook.
      </p>
      <form onSubmit={entrar} className="flex flex-col gap-4">
        <Campo
          rotulo="Seu primeiro nome"
          tamanho="celular"
          value={nome}
          maxLength={LIMITE_NOME}
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="go"
          onChange={(e) => setNome(e.target.value)}
          erro={erro}
        />
        <Botao type="submit" variante="principal" tamanho="celular" enviando={enviando} textoEnviando="Entrando">
          Entrar na mesa
        </Botao>
      </form>
    </Centro>
  );
}

function Contribuir({
  base,
  codigo,
  rotulo,
  enviadas,
  aceitas,
  offline,
  aoEnviar,
}: {
  base: string;
  codigo: string;
  rotulo: string;
  enviadas: number;
  aceitas: number;
  offline: boolean;
  aoEnviar: (e: EstadoCelularApi) => void;
}) {
  const chave = `mesa:${codigo}:rascunho:contribuicao`;
  const [texto, setTexto] = useState(() => lerRascunho(chave) ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (!enviado) return;
    const t = setTimeout(() => setEnviado(false), 3000);
    return () => clearTimeout(t);
  }, [enviado]);

  async function mandar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setErro(null);
    const r = await enviar<EstadoCelularApi>(`${base}/contribuir`, { texto });
    setEnviando(false);
    if (!r.ok) {
      setErro(r.mensagem);
      return;
    }
    setTexto("");
    guardarRascunho(chave, "");
    setEnviado(true);
    aoEnviar(r.dados);
  }

  const motivo = offline ? "Sem conexão" : !texto.trim() ? "Escreva antes de enviar" : null;

  return (
    <section className="flex flex-col gap-3 rounded-folha border-2 border-petroleo bg-papel p-4">
      <form onSubmit={mandar} className="flex flex-col gap-3">
        <label htmlFor="contribuicao" className="text-[19px] font-bold leading-snug">
          {rotulo}
        </label>
        <textarea
          id="contribuicao"
          value={texto}
          maxLength={LIMITE_CONTRIBUICAO}
          rows={4}
          onChange={(e) => {
            setTexto(e.target.value);
            guardarRascunho(chave, e.target.value);
          }}
          className="scroll-mb-32 rounded-folha border-2 border-linha bg-papel px-3 py-2 text-[17px]"
          aria-describedby="contador-contribuicao"
        />
        <span id="contador-contribuicao" className="numeros-tabulares text-sm text-tinta-suave">
          {texto.length} de {LIMITE_CONTRIBUICAO} caracteres
        </span>
        {erro ? (
          <p role="alert" className="font-bold">
            {erro}
          </p>
        ) : null}
        <Botao
          type="submit"
          variante="principal"
          tamanho="celular"
          disabled={Boolean(motivo)}
          motivo={motivo}
          enviando={enviando}
          textoEnviando="Enviando"
        >
          Enviar para a mesa
        </Botao>
        <p role="status" className="min-h-6 font-bold">
          {enviado ? (
            <span className="inline-flex items-center gap-2">
              <Icone nome="visto" className="h-5 w-5 text-estado-pronta" />
              Enviado para a mesa
            </span>
          ) : null}
        </p>
      </form>
      <p className="text-[15px] text-tinta-suave">
        Enviadas: {enviadas}. Aceitas pela mesa: {aceitas}.
      </p>
    </section>
  );
}
