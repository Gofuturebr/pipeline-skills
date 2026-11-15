"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Botao } from "@/components/base/Botao";
import { enviar } from "@/lib/cliente/estado-remoto";
import { nomeDoPapel, type PapelDoPasso } from "@/lib/jornada";
import { CAMPOS_FICHA } from "@/lib/processo";
import type { PreparoApi } from "@/lib/tipos-api";

// Preparação do evento (seção 7 do frontend): abas Evento, Processos, Mesas e
// Roteiro. Os textos dos passos são editados com a prévia de como a mesa vê.

type Aba = "evento" | "processos" | "mesas" | "roteiro";
type Processo = PreparoApi["processos"][number];

const vazio: Omit<Processo, "id" | "mesas"> = {
  nome: "",
  ficha: {},
  kitMateriais: "",
  exemploBom: "",
  exemploRuim: "",
  casoExemplo: "",
  casoNovo: "",
};

function Campo({ rotulo, valor, mudar, linhas = 1, tipo = "text" }: { rotulo: string; valor: string; mudar: (v: string) => void; linhas?: number; tipo?: string }) {
  return (
    <label className="flex flex-col gap-1.5 font-bold">
      {rotulo}
      {linhas > 1 ? (
        <textarea rows={linhas} value={valor} onChange={(e) => mudar(e.target.value)} className="rounded-folha border-2 border-linha bg-papel px-3 py-2 font-normal" />
      ) : (
        <input type={tipo} value={valor} onChange={(e) => mudar(e.target.value)} className="min-h-11 rounded-folha border-2 border-linha bg-papel px-3 font-normal" />
      )}
    </label>
  );
}

export function PreparoAdmin() {
  const [dados, setDados] = useState<PreparoApi | null>(null);
  const [aba, setAba] = useState<Aba>("evento");
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/admin/preparo", { cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (r.ok) setDados(j);
    else setMensagem({ ok: false, texto: j?.erro ?? "Não foi possível carregar os cadastros." });
  }, []);

  useEffect(() => {
    // Busca inicial dos cadastros; o estado muda quando a resposta chega.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
  }, [carregar]);

  async function salvar(acao: string, corpo: unknown, texto = "Guardado."): Promise<boolean> {
    setEnviando(true);
    setMensagem(null);
    const r = await enviar(`/api/admin/preparo/${acao}`, corpo);
    setEnviando(false);
    setMensagem(r.ok ? { ok: true, texto } : { ok: false, texto: r.mensagem });
    if (r.ok) await carregar();
    return r.ok;
  }

  if (!dados) return <main className="p-6">{mensagem?.texto ?? "Carregando"}</main>;

  const abas: { chave: Aba; texto: string }[] = [
    { chave: "evento", texto: "Evento" },
    { chave: "processos", texto: `Processos (${dados.processos.length})` },
    { chave: "mesas", texto: `Mesas (${dados.mesas.length})` },
    { chave: "roteiro", texto: "Roteiro" },
  ];

  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-5 px-4 py-6 text-[15px]">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="mr-auto font-titulo text-[28px] font-bold">Preparo do evento</h1>
        <Link href="/admin" className="font-bold text-petroleo underline underline-offset-4">
          Voltar ao painel
        </Link>
      </div>
      <div role="tablist" className="flex flex-wrap gap-1 border-b-2 border-linha">
        {abas.map((a) => (
          <button
            key={a.chave}
            type="button"
            role="tab"
            aria-selected={aba === a.chave}
            onClick={() => setAba(a.chave)}
            className={`min-h-11 px-4 font-bold ${aba === a.chave ? "border-b-4 border-petroleo" : "text-tinta-suave"}`}
          >
            {a.texto}
          </button>
        ))}
      </div>
      {mensagem ? (
        <p role={mensagem.ok ? "status" : "alert"} className="font-bold">
          {mensagem.texto}
        </p>
      ) : null}
      {aba === "evento" ? <AbaEvento dados={dados} enviando={enviando} salvar={salvar} /> : null}
      {aba === "processos" ? <AbaProcessos dados={dados} enviando={enviando} salvar={salvar} /> : null}
      {aba === "mesas" ? <AbaMesas dados={dados} enviando={enviando} salvar={salvar} /> : null}
      {aba === "roteiro" ? <AbaRoteiro dados={dados} enviando={enviando} salvar={salvar} /> : null}
    </main>
  );
}

interface PropsAba {
  dados: PreparoApi;
  enviando: boolean;
  salvar: (acao: string, corpo: unknown, texto?: string) => Promise<boolean>;
}

function AbaEvento({ dados, enviando, salvar }: PropsAba) {
  const [e, setE] = useState(dados.evento);
  const [palavras, setPalavras] = useState(dados.evento.palavrasVagas.join("\n"));
  return (
    <section className="flex max-w-[640px] flex-col gap-4">
      <Campo rotulo="Nome do evento" valor={e.nome} mudar={(v) => setE({ ...e, nome: v })} />
      <Campo rotulo="Data" tipo="date" valor={e.data} mudar={(v) => setE({ ...e, data: v })} />
      <Campo
        rotulo="Minutos de intervalo"
        tipo="number"
        valor={String(e.duracaoIntervaloMin)}
        mudar={(v) => setE({ ...e, duracaoIntervaloMin: Number(v) || 0 })}
      />
      <Campo rotulo="Palavras vagas da prova, uma por linha" linhas={6} valor={palavras} mudar={setPalavras} />
      <p className="text-tinta-suave">Uma conferência com qualquer destas palavras é recusada (RN08). As durações das fases ficam na aba Roteiro.</p>
      <div>
        <Botao
          variante="principal"
          enviando={enviando}
          textoEnviando="Guardando"
          onClick={() => salvar("evento", { ...e, palavrasVagas: palavras.split("\n") })}
        >
          Guardar o evento
        </Botao>
      </div>
    </section>
  );
}

function FormProcesso({
  inicial,
  enviando,
  salvar,
  aoFechar,
}: {
  inicial: Omit<Processo, "mesas" | "id"> & { id?: string };
  enviando: boolean;
  salvar: PropsAba["salvar"];
  aoFechar: () => void;
}) {
  const [p, setP] = useState(inicial);
  return (
    <div className="flex flex-col gap-3 rounded-folha border-2 border-petroleo bg-papel p-5">
      <Campo rotulo="Nome do processo" valor={p.nome} mudar={(v) => setP({ ...p, nome: v })} />
      <div className="grid gap-3 md:grid-cols-2">
        {CAMPOS_FICHA.map((c) => (
          <Campo
            key={c.chave}
            rotulo={`Ficha: ${c.rotulo.toLowerCase()}`}
            linhas={2}
            valor={p.ficha[c.chave] ?? ""}
            mudar={(v) => setP({ ...p, ficha: { ...p.ficha, [c.chave]: v } })}
          />
        ))}
      </div>
      <Campo rotulo="Materiais do kit (tabelas, listas, prazos)" linhas={5} valor={p.kitMateriais} mudar={(v) => setP({ ...p, kitMateriais: v })} />
      <div className="grid gap-3 md:grid-cols-2">
        <Campo rotulo="Exemplo bom" linhas={5} valor={p.exemploBom} mudar={(v) => setP({ ...p, exemploBom: v })} />
        <Campo rotulo="Exemplo ruim" linhas={5} valor={p.exemploRuim} mudar={(v) => setP({ ...p, exemploRuim: v })} />
        <Campo rotulo="Caso de exemplo (Fase 3)" linhas={3} valor={p.casoExemplo} mudar={(v) => setP({ ...p, casoExemplo: v })} />
        <Campo rotulo="Caso novo (Fase 5)" linhas={3} valor={p.casoNovo} mudar={(v) => setP({ ...p, casoNovo: v })} />
      </div>
      <p className="text-tinta-suave">Use só dados fictícios ou anonimizados.</p>
      <div className="flex flex-wrap gap-3">
        <Botao
          variante="principal"
          enviando={enviando}
          textoEnviando="Guardando"
          onClick={async () => {
            if (await salvar("processo", { ...p, id: p.id ?? null }, "Processo guardado.")) aoFechar();
          }}
        >
          Guardar o processo
        </Botao>
        <Botao variante="discreto" onClick={aoFechar}>
          Cancelar
        </Botao>
      </div>
    </div>
  );
}

function AbaProcessos({ dados, enviando, salvar }: PropsAba) {
  const [aberto, setAberto] = useState<string | null>(null);
  return (
    <section className="flex flex-col gap-3">
      {dados.processos.map((p) =>
        aberto === p.id ? (
          <FormProcesso key={p.id} inicial={p} enviando={enviando} salvar={salvar} aoFechar={() => setAberto(null)} />
        ) : (
          <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-folha border-2 border-linha bg-papel p-4">
            <span className="mr-auto font-bold">{p.nome}</span>
            <span className="text-tinta-suave">{p.mesas === 1 ? "1 mesa" : `${p.mesas} mesas`}</span>
            <Botao variante="secundario" onClick={() => setAberto(p.id)}>
              Editar
            </Botao>
            <Botao
              variante="discreto"
              disabled={p.mesas > 0}
              motivo={p.mesas > 0 ? "Em uso por mesa" : null}
              onClick={() => salvar("remover-processo", { id: p.id }, "Processo removido.")}
            >
              Remover
            </Botao>
          </div>
        ),
      )}
      {aberto === "novo" ? (
        <FormProcesso inicial={vazio} enviando={enviando} salvar={salvar} aoFechar={() => setAberto(null)} />
      ) : (
        <div>
          <Botao variante="secundario" onClick={() => setAberto("novo")}>
            Novo processo
          </Botao>
        </div>
      )}
    </section>
  );
}

function LinhaMesa({ m, processos, enviando, salvar }: { m: PreparoApi["mesas"][number]; processos: Processo[] } & Omit<PropsAba, "dados">) {
  const [nome, setNome] = useState(m.nome);
  const [processoId, setProcessoId] = useState(m.processoId ?? "");
  const mudou = nome !== m.nome || processoId !== (m.processoId ?? "");
  return (
    <tr className="border-b border-linha">
      <td className="py-2 pr-3 font-bold">{m.numero}</td>
      <td className="py-2 pr-3">
        <input aria-label={`Nome da mesa ${m.numero}`} value={nome} onChange={(e) => setNome(e.target.value)} className="min-h-11 w-full rounded-folha border-2 border-linha px-2" />
      </td>
      <td className="py-2 pr-3 font-mono font-bold">{m.codigo}</td>
      <td className="py-2 pr-3">
        <select aria-label={`Processo da mesa ${m.numero}`} value={processoId} onChange={(e) => setProcessoId(e.target.value)} className="min-h-11 w-full rounded-folha border-2 border-linha px-2">
          <option value="">Sem processo</option>
          {processos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-3">Fase {m.faseAtual}</td>
      <td className="flex flex-wrap gap-2 py-2">
        <Botao variante="secundario" disabled={!mudou || enviando} onClick={() => salvar("mesa", { id: m.id, nome, processoId: processoId || null }, "Mesa guardada.")}>
          Guardar
        </Botao>
        <Botao variante="discreto" disabled={m.faseAtual > 0} onClick={() => salvar("remover-mesa", { id: m.id }, "Mesa removida.")}>
          Remover
        </Botao>
      </td>
    </tr>
  );
}

function AbaMesas({ dados, enviando, salvar }: PropsAba) {
  return (
    <section className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-linha">
              <th className="py-2 pr-3">Nº</th>
              <th className="py-2 pr-3">Nome</th>
              <th className="py-2 pr-3">Código</th>
              <th className="py-2 pr-3">Processo</th>
              <th className="py-2 pr-3">Fase</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {dados.mesas.map((m) => (
              <LinhaMesa key={`${m.id}:${m.nome}:${m.processoId}`} m={m} processos={dados.processos} enviando={enviando} salvar={salvar} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Botao variante="secundario" enviando={enviando} textoEnviando="Criando" onClick={() => salvar("mesa", { nome: "", processoId: null }, "Mesa criada.")}>
          Acrescentar mesa
        </Botao>
        <Link href="/admin/cartoes" className="font-bold text-petroleo underline underline-offset-4">
          Cartões com QR para imprimir
        </Link>
      </div>
      <p className="text-tinta-suave">O código de cada mesa é gerado sozinho. Só sai do evento a mesa que ainda está na Fase 0, sem pasta e sem celulares.</p>
    </section>
  );
}

function Passo({ p, enviando, salvar }: { p: PreparoApi["fases"][number]["passos"][number] } & Omit<PropsAba, "dados">) {
  const [texto, setTexto] = useState(p.instrucao);
  return (
    <li className="grid gap-3 rounded-folha border-2 border-linha bg-papel p-4 lg:grid-cols-2">
      <div className="flex flex-col gap-2">
        <span className="font-bold">
          Passo {p.ordem}, {nomeDoPapel(p.papel as PapelDoPasso)}
        </span>
        <textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} className="rounded-folha border-2 border-linha px-3 py-2" aria-label={`Instrução do passo ${p.ordem}`} />
        <div>
          <Botao variante="secundario" disabled={texto === p.instrucao || enviando} onClick={() => salvar("passo", { id: p.id, instrucao: texto }, "Instrução guardada.")}>
            Guardar
          </Botao>
        </div>
      </div>
      <div className="rounded-folha bg-bancada p-4" aria-label="Prévia na tela da mesa">
        <p className="text-[13px] text-tinta-suave">Como a mesa vê</p>
        <p className="mt-1 font-titulo text-[26px] font-bold leading-tight">{texto}</p>
      </div>
    </li>
  );
}

function Fase({ f, enviando, salvar }: { f: PreparoApi["fases"][number] } & Omit<PropsAba, "dados">) {
  const [duracao, setDuracao] = useState(String(f.duracaoMin));
  const [aprofundamento, setAprofundamento] = useState(f.aprofundamento);
  const mudou = duracao !== String(f.duracaoMin) || aprofundamento !== f.aprofundamento;
  return (
    <section className="flex flex-col gap-3 border-b-2 border-linha pb-6">
      <h2 className="font-titulo text-[22px] font-bold">
        Fase {f.ordem}: {f.nome}
      </h2>
      <div className="grid gap-3 md:grid-cols-[160px_1fr]">
        <Campo rotulo="Minutos" tipo="number" valor={duracao} mudar={setDuracao} />
        <Campo rotulo="Atividade da tela de espera" linhas={2} valor={aprofundamento} mudar={setAprofundamento} />
      </div>
      <div>
        <Botao variante="secundario" disabled={!mudou || enviando} onClick={() => salvar("fase", { id: f.id, duracaoMin: Number(duracao), aprofundamento }, "Fase guardada.")}>
          Guardar a fase
        </Botao>
      </div>
      <ol className="flex flex-col gap-3">
        {f.passos.map((p) => (
          <Passo key={`${p.id}:${p.instrucao}`} p={p} enviando={enviando} salvar={salvar} />
        ))}
      </ol>
    </section>
  );
}

function AbaRoteiro({ dados, enviando, salvar }: PropsAba) {
  const total = dados.fases.reduce((s, f) => s + f.duracaoMin, 0) + dados.evento.duracaoIntervaloMin;
  return (
    <div className="flex flex-col gap-6">
      <p className="text-tinta-suave">
        Soma das fases com o intervalo: {total} minutos. Sem travessões nos textos: use vírgula, ponto ou dois-pontos.
      </p>
      {dados.fases.map((f) => (
        <Fase key={`${f.id}:${f.duracaoMin}:${f.aprofundamento}`} f={f} enviando={enviando} salvar={salvar} />
      ))}
    </div>
  );
}
