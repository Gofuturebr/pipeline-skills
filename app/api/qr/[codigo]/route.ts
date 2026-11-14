import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { normalizarCodigo } from "@/lib/servidor/consultas";
import { enderecoDoParticipante } from "@/lib/servidor/endereco";
import { erro } from "@/lib/servidor/http";

// QR da mesa: leva o celular para /p/[codigo]. Usado na tela da mesa e nos
// cartões impressos.
export async function GET(req: NextRequest, ctx: RouteContext<"/api/qr/[codigo]">) {
  const codigo = normalizarCodigo((await ctx.params).codigo);
  if (!/^[A-Z0-9]{3,16}$/.test(codigo)) return erro("Código inválido.", 400);
  const svg = await QRCode.toString(enderecoDoParticipante(req.headers, codigo), {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#14262b", light: "#ffffff" },
  });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" } });
}
