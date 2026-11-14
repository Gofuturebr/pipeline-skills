import type { Metadata, Viewport } from "next";
import { TelaParticipante } from "@/components/participante/TelaParticipante";

export const metadata: Metadata = { title: "Mesa de Skills: celular" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, interactiveWidget: "resizes-content" };

export default async function PaginaParticipante({ params }: PageProps<"/p/[codigo]">) {
  const { codigo } = await params;
  return <TelaParticipante codigo={codigo.toUpperCase()} />;
}
