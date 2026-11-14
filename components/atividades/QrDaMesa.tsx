"use client";

// QR que leva o celular para a tela do participante, com o endereço escrito
// para quem preferir digitar.

export function QrDaMesa({
  codigo,
  endereco,
  tamanho = 240,
}: {
  codigo: string;
  endereco: string;
  tamanho?: number;
}) {
  return (
    <figure className="flex flex-col items-center gap-3 rounded-folha border-2 border-linha bg-papel p-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG gerado pelo servidor, sem otimização */}
      <img
        src={`/api/qr/${encodeURIComponent(codigo)}`}
        width={tamanho}
        height={tamanho}
        alt="QR para entrar na mesa pelo celular"
      />
      <figcaption className="text-center text-base leading-snug text-tinta-suave">
        Ou digitem no celular:
        <br />
        <span className="break-all font-mono text-lg text-tinta">{endereco}</span>
      </figcaption>
    </figure>
  );
}
