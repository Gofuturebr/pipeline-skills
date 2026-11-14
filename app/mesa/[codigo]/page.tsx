import { headers } from "next/headers";
import { TelaMesa } from "@/components/mesa/TelaMesa";
import { enderecoDoParticipante } from "@/lib/servidor/endereco";

export default async function PaginaMesa({ params }: PageProps<"/mesa/[codigo]">) {
  const codigo = (await params).codigo.toUpperCase();
  const endereco = enderecoDoParticipante(await headers(), codigo);
  return <TelaMesa codigo={codigo} enderecoParticipante={endereco} />;
}
