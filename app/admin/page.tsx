import { redirect } from "next/navigation";
import { PainelAdmin } from "@/components/admin/PainelAdmin";
import { sessaoDaPagina } from "@/lib/servidor/sessao-pagina";

export default async function PaginaAdmin() {
  const sessao = await sessaoDaPagina();
  if (!sessao) redirect("/admin/entrar");
  return <PainelAdmin perfil={sessao.perfil} nome={sessao.nome} />;
}
