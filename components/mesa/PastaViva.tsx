"use client";

// Pasta viva: desenhada como pasta de arquivo, com aba e cor amarela.
// É o único elemento quente da tela. Os arquivos chegam a partir do Marco 3.

export function PastaViva({ nomeSkill }: { nomeSkill: string }) {
  const arquivos: string[] = [];
  return (
    <section aria-label="Pasta viva" className="flex h-full flex-col gap-4 px-5 py-6">
      <div className="relative pt-7">
        <div className="absolute left-0 top-0 h-8 max-w-[85%] truncate rounded-t-[8px] border-2 border-b-0 border-pasta-sombra bg-pasta-sombra px-3 pt-1 font-mono text-[15px] font-semibold text-tinta">
          {nomeSkill ? `/${nomeSkill}` : "/skill-da-mesa"}
        </div>
        <div className="min-h-64 rounded-b-[8px] rounded-tr-[8px] border-2 border-pasta-sombra bg-pasta px-4 py-5 shadow-[0_2px_0_#c98f12]">
          {arquivos.length === 0 ? (
            <p className="text-xl leading-snug text-tinta">A skill de vocês vai aparecer aqui</p>
          ) : null}
        </div>
      </div>
      <p className="text-base text-tinta-suave">
        {arquivos.length === 1 ? "1 arquivo" : `${arquivos.length} arquivos`}
      </p>
    </section>
  );
}
