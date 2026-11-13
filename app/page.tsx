import { EntradaMesa } from "@/components/mesa/EntradaMesa";

export default function Inicio() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-titulo text-[40px] font-bold leading-[1.15]">Mesa de Skills</h1>
          <p className="text-xl text-tinta-suave">Digitem o código que está no cartão da mesa.</p>
        </div>
        <EntradaMesa />
      </div>
    </main>
  );
}
