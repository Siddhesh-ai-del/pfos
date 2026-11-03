// LLM provider seam (§6 / §7 risk 1). The weave speaks to this interface only;
// OpenRouter (OpenAI-compatible Chat Completions) is the default provider,
// reached with plain fetch — no SDK dependency (§6 dependency budget).
// Tests inject a scripted client.

export type LlmMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; tool_call_id: string; name: string; content: string };

export type LlmToolCall = {
  id: string;
  name: string;
  args: string; // raw JSON string from the model; validated downstream
};

export type LlmToolDef = {
  name: string;
  description: string;
  // JSON Schema for the provider's function-calling surface
  schema: Record<string, unknown>;
};

export type LlmClient = {
  /** model id used (for audit_log.model) */
  readonly model: string;
  chat(messages: LlmMessage[], tools: LlmToolDef[]): Promise<LlmResponse>;
};

export type LlmResponse = {
  text: string | null;
  toolCalls?: LlmToolCall[];
};

function toProviderTools(tools: LlmToolDef[]) {
  return tools.map((d) => ({
    type: "function" as const,
    function: { name: d.name, description: d.description, parameters: d.schema },
  }));
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export function makeOpenRouterLlm(opts?: { model?: string }): LlmClient {
  const model =
    opts?.model ??
    process.env.OPENROUTER_MODEL ??
    "meta-llama/llama-3.3-70b-instruct";
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is not set — add it to .env.local (see .env.local.example)."
    );
  }
  return {
    model,
    async chat(messages, tools) {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "X-Title": "PFOS",
        },
        body: JSON.stringify({
          model,
          messages,
          tools: toProviderTools(tools),
          temperature: 0.2,
          max_tokens: 400,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 200)}`);
      }
      const body = (await res.json()) as {
        choices?: Array<{
          message?: {
            content: string | null;
            tool_calls?: Array<{
              id: string;
              function: { name: string; arguments: string };
            }>;
          };
        }>;
      };
      const msg = body.choices?.[0]?.message;
      return {
        text: msg?.content ?? null,
        toolCalls: (msg?.tool_calls ?? []).map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          args: tc.function.arguments,
        })),
      };
    },
  };
}
