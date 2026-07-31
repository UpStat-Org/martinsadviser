// ---------------------------------------------------------------------------
// Chat-completion client for the AI functions (ai-chat, ai-draft, ai-report).
//
// Previously each function POSTed to Lovable's gateway with a LOVABLE_API_KEY.
// That key is issued and billed by the Lovable platform, so leaving Lovable
// took the three AI features down with it. This module points them at Groq
// instead, whose API is OpenAI-compatible — the request/response shape is
// unchanged, only the host, the key and the model id differ.
//
// Endpoint and model are env-driven, not hardcoded: hosted model ids get
// retired on a rolling basis, and swapping a secret is a lot cheaper than
// redeploying three functions. AI_BASE_URL also keeps the escape hatch open —
// any OpenAI-compatible provider works without touching this file.
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Carries the upstream HTTP status so callers can map 429/402 to their own. */
export class AiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AiError";
  }
}

/**
 * Sends a chat completion and returns the assistant's text.
 * Throws AiError on any non-2xx so the caller can branch on `status`.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  opts: { temperature?: number; responseFormatJson?: boolean } = {},
): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new AiError("GROQ_API_KEY not configured", 500);

  const baseUrl = (Deno.env.get("AI_BASE_URL") ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = Deno.env.get("AI_MODEL");
  if (!model) throw new AiError("AI_MODEL not configured", 500);

  const body: Record<string, unknown> = { model, messages };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  // Groq honours OpenAI's JSON mode. Callers that parse the reply as JSON use
  // it so the model can't wrap the object in prose or ``` fences.
  if (opts.responseFormatJson) body.response_format = { type: "json_object" };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("AI provider error:", response.status, text);
    throw new AiError("AI provider error", response.status);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content ?? "";
}

/**
 * Maps an AiError onto the response shape the three AI functions already
 * returned, so the frontend's error handling stays exactly as it was.
 * Returns null when `err` is not an AiError worth surfacing verbatim.
 */
export function aiErrorResponse(
  err: unknown,
  corsHeaders: Record<string, string>,
): Response | null {
  if (!(err instanceof AiError)) return null;

  const json = (status: number, error: string) =>
    new Response(JSON.stringify({ error }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (err.status === 429) return json(429, "Rate limit exceeded. Try again later.");
  if (err.status === 402) return json(402, "Payment required. Add credits to your workspace.");
  return null;
}
