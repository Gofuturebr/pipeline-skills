import { redirect } from "next/navigation";
import { EntradaAdmin } from "@/components/admin/EntradaAdmin";
import { sessaoDaPagina } from "@/lib/servidor/sessao-pagina";

export default async function PaginaEntrarAdmin() {
  if (await sessaoDaPagina()) redirect("/admin");
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <h1 className="font-titulo text-[28px] font-bold leading-tight">Painel do gestor</h1>
        <EntradaAdmin />
      </div>
    </main>
  );
}
