// Ícones próprios, em SVG, sem biblioteca externa. Traço de 2 px.

export type NomeIcone =
  | "andamento"
  | "visto"
  | "relogio"
  | "mao"
  | "pausa"
  | "sem-sinal"
  | "sinal"
  | "cadeado"
  | "xis"
  | "seta-voltar"
  | "mais"
  | "menos";

const CAMINHOS: Record<NomeIcone, React.ReactNode> = {
  andamento: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 9 9h-9z" fill="currentColor" stroke="none" />
    </>
  ),
  visto: <path d="M4 12.5l5 5L20 6.5" />,
  relogio: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2M9 2h6" />
    </>
  ),
  mao: (
    <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-6.5a1.5 1.5 0 0 1 3 0V11m0-5a1.5 1.5 0 0 1 3 0v6m0-3a1.5 1.5 0 0 1 3 0v5.5A6.5 6.5 0 0 1 13.5 21h-1.2a6 6 0 0 1-4.6-2.2L4.4 14.6a1.6 1.6 0 0 1 2.4-2L8 14" />
  ),
  pausa: (
    <>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </>
  ),
  "sem-sinal": <path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0M12 19h.01M3 3l18 18" />,
  sinal: <path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0M12 19h.01" />,
  cadeado: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  xis: <path d="M6 6l12 12M18 6L6 18" />,
  "seta-voltar": <path d="M10 6l-6 6 6 6M4 12h16" />,
  mais: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
};

export function Icone({
  nome,
  className = "h-5 w-5",
  titulo,
}: {
  nome: NomeIcone;
  className?: string;
  titulo?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={titulo ? undefined : true}
      role={titulo ? "img" : undefined}
    >
      {titulo ? <title>{titulo}</title> : null}
      {CAMINHOS[nome]}
    </svg>
  );
}
