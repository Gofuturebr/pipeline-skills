import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PreparoAdmin } from "@/components/admin/PreparoAdmin";
import { sessaoDaPagina } from "@/lib/servidor/sessao-pagina";
import { pode } from "@/lib/permissoes";

export const metadata: Metadata = { title: "Preparo do evento" };

export default async function PaginaPreparo() {
  const sessao = await sessaoDaPagina();
  if (!sessao) redirect("/admin/entrar");
  if (!pode(sessao.perfil, "preparo")) redirect("/admin");
  return <PreparoAdmin />;
}
