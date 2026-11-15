// npm run ia:testar   confere se este computador consegue falar com a IA.
// Faz uma chamada pequena (poucos centavos) e explica o problema, se houver.
// Nunca mostra a chave.
import { existsSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { modeloDaIA } from "@/lib/ia/cliente";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

function dica(e: unknown): string {
  const texto = `${e instanceof Error ? e.message : String(e)} ${(e as { cause?: unknown })?.cause ?? ""}`;
  if (e instanceof Anthropic.AuthenticationError) return "A chave não foi aceita. Confira a linha ANTHROPIC_API_KEY no .env.local (sem espaços nem aspas).";
  if (e instanceof Anthropic.PermissionDeniedError) return "A chave não tem permissão para este modelo ou a conta está sem créditos.";
  if (e instanceof Anthropic.NotFoundError) {
    return "O modelo não existe para esta conta. No .env.local, deixe a linha exatamente assim: ANTHROPIC_MODEL=claude-opus-5-5 (ou ANTHROPIC_MODEL= vazio, para usar o padrão).";
  }
  if (e instanceof Anthropic.RateLimitError) return "Limite de pedidos ou de gasto da conta atingido. Confira o painel da Anthropic.";
  if (e instanceof Anthropic.BadRequestError) return "A IA recusou o pedido. Se a mensagem fala em créditos ou cobrança, a conta precisa de saldo.";
  if (/certificate|self.signed|SELF_SIGNED|UNABLE_TO_GET_ISSUER|unable to verify/i.test(texto)) {
    return "O certificado de segurança foi trocado no caminho. Costuma ser antivírus ou rede da empresa inspecionando o HTTPS. Teste em outra rede (por exemplo, o roteador do celular) ou desligue a verificação HTTPS do antivírus.";
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(texto)) return "O computador não achou o endereço api.anthropic.com. Confira a internet.";
  if (/ECONNREFUSED|ECONNRESET|ETIMEDOUT|timed? ?out|socket hang up/i.test(texto) || e instanceof Anthropic.APIConnectionError) {
    return "Sem conexão com api.anthropic.com. Confira a internet, o firewall, o antivírus ou um proxy da rede. Teste em outra rede, por exemplo o roteador do celular.";
  }
  return "Erro inesperado. Mande a mensagem acima para o responsável técnico.";
}

async function main() {
  const chave = process.env.ANTHROPIC_API_KEY?.trim() ?? "";
  const escrito = process.env.ANTHROPIC_MODEL?.trim() ?? "";
  const modelo = modeloDaIA();
  console.log(`Node ${process.version}`);
  console.log(`Chave: ${chave ? `preenchida (${chave.length} caracteres)` : "VAZIA"}`);
  console.log(`Modelo: ${modelo}${!escrito ? " (padrão)" : escrito !== modelo ? ` (no .env.local está "${escrito}")` : ""}`);
  if (process.env.IA_SIMULADA === "1") console.log("Atenção: IA_SIMULADA=1 está ligada. As mesas usam a IA de teste, não a real.");
  if (!chave) {
    console.log("\nResultado: falta a chave. Preencha ANTHROPIC_API_KEY no .env.local e reinicie o servidor.");
    process.exitCode = 1;
    return;
  }
  const cliente = new Anthropic({ apiKey: chave, baseURL: "https://api.anthropic.com", maxRetries: 0, timeout: 60_000 });
  const inicio = Date.now();
  try {
    const r = await cliente.messages.create({
      model: modelo,
      max_tokens: 200,
      messages: [{ role: "user", content: "Responda só: a IA está funcionando." }],
    });
    const texto = r.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    console.log(`\nResultado: a IA respondeu em ${((Date.now() - inicio) / 1000).toFixed(1)} s: "${texto}"`);
    console.log("Está tudo certo. Se a mesa ainda mostrar erro, reinicie o npm run dev.");
  } catch (e) {
    const status = e instanceof Anthropic.APIError ? ` (código ${e.status ?? "sem código"})` : "";
    console.log(`\nResultado: a IA não respondeu${status}.`);
    console.log(`Mensagem: ${e instanceof Error ? e.message : String(e)}`);
    const causa = (e as { cause?: unknown })?.cause;
    if (causa) console.log(`Causa: ${causa instanceof Error ? causa.message : String(causa)}`);
    console.log(`O que fazer: ${dica(e)}`);
    process.exitCode = 1;
  }
}

main();
