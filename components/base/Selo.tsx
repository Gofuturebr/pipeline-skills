import { Icone, type NomeIcone } from "./Icone";
import type { EstadoMostrado } from "@/lib/maquina";
import type { EstadoConexao } from "@/lib/cliente/sinais";

// Estado nunca é só cor: ícone e palavra sempre juntos. A palavra fica em tinta,
// a cor do estado vai no ícone (contraste mínimo de 3 para 1).

export type EstadoVisual = EstadoMostrado | "ajuda" | "sem_conexao";

export const ESTADOS: Record<EstadoVisual, { palavra: string; icone: NomeIcone; cor: string; fundo: string }> = {
  em_andamento: { palavra: "Em andamento", icone: "andamento", cor: "text-estado-andamento", fundo: "bg-estado-andamento" },
  pronta: { palavra: "Pronta", icone: "visto", cor: "text-estado-pronta", fundo: "bg-estado-pronta" },
  atrasada: { palavra: "Atrasada", icone: "relogio", cor: "text-estado-atrasada", fundo: "bg-estado-atrasada" },
  ajuda: { palavra: "Pediu ajuda", icone: "mao", cor: "text-estado-ajuda", fundo: "bg-estado-ajuda" },
  pausada: { palavra: "Pausada", icone: "pausa", cor: "text-estado-pausada", fundo: "bg-estado-pausada" },
  sem_conexao: { palavra: "Sem conexão", icone: "sem-sinal", cor: "text-estado-sem-conexao", fundo: "bg-estado-sem-conexao" },
};

export function SeloEstado({ estado, className = "" }: { estado: EstadoVisual; className?: string }) {
  const e = ESTADOS[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold text-tinta ${className}`}>
      <Icone nome={e.icone} className={`h-5 w-5 ${e.cor}`} />
      {e.palavra}
    </span>
  );
}

export function SeloPapel({ texto, tamanho = "normal" }: { texto: string; tamanho?: "mesa" | "normal" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border-2 border-petroleo bg-petroleo-claro font-bold text-petroleo ${
        tamanho === "mesa" ? "px-4 py-1 text-base" : "px-3 py-0.5 text-sm"
      }`}
    >
      {texto}
    </span>
  );
}

const CONEXAO: Record<EstadoConexao, { palavra: string; icone: NomeIcone; cor: string }> = {
  conectado: { palavra: "Conectado", icone: "sinal", cor: "text-estado-pronta" },
  reconectando: { palavra: "Reconectando", icone: "sinal", cor: "text-estado-atrasada" },
  sem_conexao: { palavra: "Sem conexão", icone: "sem-sinal", cor: "text-estado-sem-conexao" },
};

export function IndicadorConexao({ estado }: { estado: EstadoConexao }) {
  const c = CONEXAO[estado];
  return (
    <span className="inline-flex items-center gap-1.5 text-base text-tinta" role="status">
      <Icone nome={c.icone} className={`h-5 w-5 ${c.cor}`} />
      {c.palavra}
    </span>
  );
}
