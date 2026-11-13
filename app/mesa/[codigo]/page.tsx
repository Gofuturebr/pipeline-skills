import { TelaMesa } from "@/components/mesa/TelaMesa";

export default async function PaginaMesa({ params }: PageProps<"/mesa/[codigo]">) {
  const { codigo } = await params;
  return <TelaMesa codigo={codigo.toUpperCase()} />;
}
