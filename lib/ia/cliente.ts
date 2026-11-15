import Anthropic from "@anthropic-ai/sdk";

// Única porta de saída para a IA. Roda só no servidor: a chave vem de
// ANTHROPIC_API_KEY e nunca vai para o navegador. O modelo vem de
// ANTHROPIC_MODEL. Os testes trocam o transmissor por uma IA simulada.

export type Esforco = "low" | "medium" | "high";

export interface PedidoIA {
  /** Nome curto da tarefa, para o registro de erros. */
  tarefa: string;
  sistema: string;
  mensagens: Anthropic.Beta.BetaMessageParam[];
  esforco: Esforco;
  maxTokens: number;
  /** Esquema JSON da resposta (saída estruturada). */
  esquema?: Record<string, unknown>;
}

export interface ResultadoIA {
  texto: string;
  /** "fim": terminou; "recusa": a IA não quis responder; "limite": acabou o espaço. */
  parada: "fim" | "recusa" | "limite";
  modelo: string;
}

export type TransmissorIA = (pedido: PedidoIA, aoTexto: (delta: string) => void) => Promise<ResultadoIA>;

export class IaIndisponivel extends Error {}

export const MODELO_PADRAO = "claude-opus-5-5";

/** Modelos que aceitam a troca automática para outro modelo quando a IA recusa. */
const COM_TROCA_AUTOMATICA = /^claude-(opus-5-5|opus-5|fable-5(-[12])?|sonnet-5-5)$/;

/**
 * Aceita o nome do modelo como aparece nos sites ("Opus 5.5", "Claude Sonnet 5.5")
 * e converte para o identificador da API ("claude-opus-5-5"). Vazio vale o padrão.
 */
export function normalizarModelo(bruto: string | undefined): string {
  // Linha colada duas vezes ("ANTHROPIC_MODEL=claude-opus-5-5"): vale o que vem depois do último "=".
  const valor = (bruto ?? "").split("=").pop()!.trim().replace(/^["']|["']$/g, "");
  if (!valor) return MODELO_PADRAO;
  if (/^claude-[a-z0-9-]+$/.test(valor)) return valor;
  const id = valor
    .toLowerCase()
    .replace(/^claude[\s_-]*/, "")
    .replace(/[\s._]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return id ? `claude-${id}` : MODELO_PADRAO;
}

export function modeloDaIA(): string {
  return normalizarModelo(process.env.ANTHROPIC_MODEL);
}

export function iaConfigurada(): boolean {
  return Boolean(transmissorDeTeste) || process.env.IA_SIMULADA === "1" || Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

let transmissorDeTeste: TransmissorIA | null = null;

/** Só para testes: troca a IA de verdade por uma simulada. */
export function definirIAParaTestes(t: TransmissorIA | null) {
  transmissorDeTeste = t;
}

let cliente: Anthropic | null = null;

function obterCliente(): Anthropic {
  const chave = process.env.ANTHROPIC_API_KEY?.trim();
  if (!chave) throw new IaIndisponivel("ANTHROPIC_API_KEY não configurada");
  if (!cliente) {
    // O endereço é fixo: o projeto não usa ANTHROPIC_BASE_URL, para nenhuma
    // variável do ambiente desviar as chamadas.
    cliente = new Anthropic({ apiKey: chave, baseURL: "https://api.anthropic.com", maxRetries: 2, timeout: 120_000 });
  }
  return cliente;
}

const transmissorReal: TransmissorIA = async (pedido, aoTexto) => {
  const modelo = modeloDaIA();
  const comTroca = COM_TROCA_AUTOMATICA.test(modelo);
  const stream = obterCliente().beta.messages.stream({
    model: modelo,
    max_tokens: pedido.maxTokens,
    system: [{ type: "text", text: pedido.sistema, cache_control: { type: "ephemeral" } }],
    messages: pedido.mensagens,
    output_config: {
      effort: pedido.esforco,
      ...(pedido.esquema ? { format: { type: "json_schema" as const, schema: pedido.esquema } } : {}),
    },
    ...(comTroca ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
  });
  stream.on("text", (delta) => aoTexto(delta));
  const final = await stream.finalMessage();
  const texto = final.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parada = final.stop_reason === "refusal" ? "recusa" : final.stop_reason === "max_tokens" ? "limite" : "fim";
  return { texto, parada, modelo: final.model };
};

let simuladaDoAmbiente: TransmissorIA | null = null;

/** Chama a IA com streaming. Cada pedaço de texto chega em aoTexto. */
export async function transmitir(pedido: PedidoIA, aoTexto: (delta: string) => void = () => {}): Promise<ResultadoIA> {
  if (transmissorDeTeste) return transmissorDeTeste(pedido, aoTexto);
  if (process.env.IA_SIMULADA === "1") {
    if (!simuladaDoAmbiente) simuladaDoAmbiente = (await import("./simulada")).criarIaSimulada().transmissor;
    return simuladaDoAmbiente(pedido, aoTexto);
  }
  return transmissorReal(pedido, aoTexto);
}

/** Mensagem para a mesa quando a chamada à IA falha. Nunca expõe detalhes técnicos. */
export function mensagemDeFalhaDaIA(e: unknown): string {
  if (e instanceof IaIndisponivel) return "A IA não está configurada neste servidor. Avisem o gestor.";
  if (e instanceof Anthropic.RateLimitError) {
    return "A IA está com muitos pedidos agora. Esperem alguns segundos e tentem de novo.";
  }
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    return "A chave da IA não foi aceita. Avisem o gestor.";
  }
  // Sem conexão com a IA: internet, firewall ou antivírus do computador que roda o servidor.
  if (e instanceof Anthropic.APIConnectionError) {
    return "O servidor não conseguiu se conectar à IA. Avisem o gestor. O que vocês escreveram está salvo.";
  }
  if (e instanceof Anthropic.NotFoundError) {
    return "O modelo de IA configurado não foi encontrado. Avisem o gestor.";
  }
  if (e instanceof Anthropic.InternalServerError) {
    return "A IA está sobrecarregada agora. Esperem alguns segundos e tentem de novo.";
  }
  return "A resposta não chegou. O que vocês escreveram está salvo.";
}
