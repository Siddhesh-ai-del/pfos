// Agent weave loop (§5.5) — ONE loop, hard-capped at 3 tool iterations.
// The LLM sees: system rules (§2.5) + conversation + verbatim tool results.
// NEVER computes money math; numbers come back from the executor envelope.
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeToolCall } from "./executor";
import { TOOL_SCHEMAS } from "./tools";
import { RELEASED_TOOL_DEFS } from "./tool-defs";
import { SYSTEM_PROMPT } from "./system-prompt";
import type { LlmClient, LlmMessage } from "./llm";

export type ChatTurn = { role: "user" | "assistant"; text: string };

export type WeaveInput = {
  requestId: string;
  messages: ChatTurn[];
};

export type WeaveOutput = {
  reply: string;
  cards: unknown[];
  refresh: boolean;
  httpStatus: number;
  /** executed tool names, in weave order (UI renders these as "Tool" chips) */
  toolTrace: string[];
};

const MAX_TOOL_ITERATIONS = 3;
const BAIL_LINE =
  "Let me stop here rather than guess. Could you restate what you'd like?";

function toLlmMessages(chat: ChatTurn[]): LlmMessage[] {
  const history: LlmMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...chat.map((m): LlmMessage => ({ role: m.role, content: m.text })),
  ];
  return history;
}

export async function runWeave(
  supabase: SupabaseClient,
  llm: LlmClient,
  input: WeaveInput
): Promise<WeaveOutput> {
  let messages = toLlmMessages(input.messages);
  let anyToolExecuted = false;
  const toolTrace: string[] = [];
  const toolCards: unknown[] = [];

  try {
    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await llm.chat(messages, RELEASED_TOOL_DEFS);

      const toolCalls = response.toolCalls ?? [];

      // 1) Pure prose → done.
      if (toolCalls.length === 0) {
        const text = response.text?.trim() || BAIL_LINE;
        return {
          reply: text,
          cards: toolCards,
          refresh: anyToolExecuted,
          httpStatus: 200,
          toolTrace,
        };
      }

      // 2) Tool call: exactly ONE per iteration (weave discipline). The rest
      //    are refused as tool_error rather than silently ignored.
      const call = toolCalls[0];
      let parsedArgs: unknown = {};
      try {
        parsedArgs = call.args ? JSON.parse(call.args) : {};
      } catch {
        parsedArgs = { __malformed_json: call.args?.slice(0, 200) };
      }

      const exec = await executeToolCall(supabase, {
        requestId: input.requestId,
        toolName: call.name,
        rawArgs: parsedArgs,
      });
      if (exec.card) toolCards.push(exec.card);

      // extra tool calls in one response are refused (one per iteration)
      for (const extra of toolCalls.slice(1)) {
        await executeToolCall(supabase, {
          requestId: input.requestId,
          toolName: extra.name,
          rawArgs: { __note: "refused_extra_call_same_turn" },
        });
      }

      // 3) Weave: the LLM sees the verbatim envelope, verbatim.
      if (call.name in TOOL_SCHEMAS && !exec.error) {
        anyToolExecuted = true;
        toolTrace.push(call.name);
      }
      messages = [
        ...messages,
        {
          role: "assistant",
          content: response.text ?? null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: tc.args },
          })),
        },
        {
          role: "tool",
          tool_call_id: call.id,
          name: call.name,
          content: JSON.stringify(exec.toolResult),
        },
      ];
      // NOTE: extra refusals are also woven so the model stops batching
      for (const extra of toolCalls.slice(1)) {
        messages.push({
          role: "tool",
          tool_call_id: extra.id,
          name: extra.name,
          content: JSON.stringify({ status: "error", error: "one_tool_per_turn" }),
        });
      }
    }
  } catch (e) {
    // LLM/transport failure → quiet, honest failure (design §4.6 error state)
    console.error("weave failed:", e instanceof Error ? e.message : e);
    return {
      reply:
        "I couldn't reach the ledger brain just now. Try again in a moment.",
      cards: toolCards,
      refresh: false,
      httpStatus: 502,
      toolTrace,
    };
  }

  // 4) Tool-loop cap reached → bail politely. NEVER guess numbers.
  return { reply: BAIL_LINE, cards: toolCards, refresh: anyToolExecuted, httpStatus: 200, toolTrace };
}
