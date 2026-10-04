// Minimal client for OpenAI-compatible chat completions (9router, or any gateway exposing /chat/completions).
// No I/O beyond fetch and no relative imports, so it runs under plain Node for tests.

export class AiNotConfigured extends Error {}

export class AiRequestError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export type ResponseFormat = "none" | "json_object" | "json_schema";

export type ChatConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  responseFormat?: ResponseFormat;
  timeoutMs?: number;
};

export type ChatMessage = { role: "system" | "user"; content: string };

const LOCAL_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]$)/;

// Health data must not travel over plain HTTP across the internet: http is accepted only for local/private hosts
// (localhost, a Docker service name, host.docker.internal, private IP ranges). Everything else needs https.
export function checkBaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new AiNotConfigured("AI_BASE_URL không phải URL hợp lệ.");
  }
  const host = url.hostname.toLowerCase();
  const isLocal = LOCAL_HOST.test(host) || host.endsWith(".internal") || host.endsWith(".local") || !host.includes(".");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) {
    throw new AiNotConfigured("AI_BASE_URL phải dùng https (http chỉ được cho máy cục bộ hoặc mạng nội bộ).");
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

// Models sometimes wrap JSON in markdown fences or add a sentence around it.
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end > start ? body.slice(start, end + 1) : body;
}

type Completion = { choices?: { message?: { content?: unknown } }[] };

function contentText(c: unknown): string | null {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    const parts = c.map((p) => (p && typeof p === "object" && "text" in p && typeof p.text === "string" ? p.text : "")).join("");
    return parts || null;
  }
  return null;
}

// Error messages deliberately carry only the status code: a provider's error body can echo the request, which is health data.
export async function chatJson(
  cfg: ChatConfig,
  messages: ChatMessage[],
  schema?: Record<string, unknown>,
): Promise<string> {
  const body: Record<string, unknown> = { model: cfg.model, messages, temperature: 0.2, max_tokens: 4096, stream: false };
  const fmt = cfg.responseFormat ?? "none";
  if (fmt === "json_object") body.response_format = { type: "json_object" };
  if (fmt === "json_schema" && schema) {
    body.response_format = { type: "json_schema", json_schema: { name: "report_narrative", strict: true, schema } };
  }

  let res: Response;
  try {
    res = await fetch(`${checkBaseUrl(cfg.baseUrl)}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(cfg.timeoutMs ?? 60_000),
    });
  } catch (e) {
    if (e instanceof AiNotConfigured) throw e;
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new AiRequestError(timedOut ? "AI timeout" : "AI unreachable");
  }
  if (!res.ok) throw new AiRequestError(`AI HTTP ${res.status}`, res.status);

  let data: Completion;
  try {
    data = (await res.json()) as Completion;
  } catch {
    throw new AiRequestError("AI returned a non-JSON response", res.status);
  }
  const text = contentText(data.choices?.[0]?.message?.content);
  if (!text) throw new AiRequestError("AI returned an empty completion", res.status);
  return extractJson(text);
}
