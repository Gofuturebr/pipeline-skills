import { redirect } from "next/navigation";
import { PainelAdmin } from "@/components/admin/PainelAdmin";
import { sessaoDaPagina } from "@/lib/servidor/sessao-pagina";

/** Detalhe da mesa: o próprio painel, com a gaveta aberta. */
export default async function PaginaDetalheMesa({ params }: PageProps<"/admin/mesa/[id]">) {
  const sessao = await sessaoDaPagina();
  if (!sessao) redirect("/admin/entrar");
  const { id } = await params;
  return <PainelAdmin perfil={sessao.perfil} nome={sessao.nome} mesaInicial={id} />;
}
