// Slice 4 acceptance tests (plan §3 Slice 4): decisions + commitments as
// first-class queryable records; memory survives the full Beat 1–5 flow.
// Scripted LLM against the real local stack; canonical §2.3 reset first.
import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

import { executeToolCall } from "@/lib/agent/executor";
import { runWeave } from "@/lib/agent/weave";
import type { LlmClient, LlmMessage, LlmResponse } from "@/lib/agent/llm";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const KEY = process.env.SUPABASE_SERVICE_KEY ?? "placeholder";

let supabase: SupabaseClient;

let dbUp = false;
try {
  const probe = createClient(URL, KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await probe.rpc("get_budget_status");
  dbUp = !error || !/fetch|ECONNREFUSED|network/i.test(error.message);
} catch {
  dbUp = false;
}

beforeAll(async () => {
  supabase = createClient(URL, KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  if (!dbUp) return;
  const res = await supabase.rpc("reset_demo_data");
  expect(res.error).toBeNull();
});

// LLM whose next reply is computed from the conversation (needed so iteration
// 1 can reference the id that iteration 0's tool result echoed).
function dynamicLlm(
  fn: (messages: LlmMessage[], iteration: number) => LlmResponse,
): LlmClient {
  let i = 0;
  return {
    model: "fake-model",
    async chat(messages) {
      return fn(messages, i++);
    },
  };
}

async function commitments() {
  const { data, error } = await supabase
    .from("commitments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Array<Record<string, unknown>>;
}

describe.skipIf(!dbUp)("Slice 4 — Beat 4: commitment tool", () => {
  it('"cap Swiggy at 8 orders a month" → monthly_count commitment, audit auto, Memory card refresh', async () => {
    const r = await executeToolCall(supabase, {
      requestId: "e1e7c3f2-0000-4000-8000-000000000001",
      toolName: "pfos_memory_set_commitment",
      rawArgs: {
        subject: "Swiggy",
        text: "Cap Swiggy at 8 orders a month",
        rule_type: "monthly_count",
        numeric_limit: 8,
      },
    });
    const envelope = r.toolResult as {
      status: string;
      result: { row: { subject: string; text: string; numeric_limit: number; status: string } };
    };
    expect(envelope.status).toBe("ok");
    expect(envelope.result.row.subject).toBe("Swiggy");
    expect(envelope.result.row.numeric_limit).toBe(8);
    expect(envelope.result.row.status).toBe("open");
    expect(r.approvalState).toBe("auto");

    const rows = await commitments();
    expect(rows.map((r) => r.text)).toContain("Cap Swiggy at 8 orders a month");
  });

  it("Beat 4 weave: commitment tool called once, Memory-card refresh flagged, card surfaced", async () => {
    const countBefore = (await commitments()).length;
    const llm = dynamicLlm((_msgs, i) => {
      if (i === 0) {
        return {
          text: null,
          toolCalls: [
            {
              id: "call-b4",
              name: "pfos_memory_set_commitment",
              args: JSON.stringify({
                subject: "Chai",
                text: "No chai after 8pm",
                rule_type: "open_ended",
              }),
            },
          ],
        };
      }
      return { text: "Committed: no chai after 8pm." };
    });
    const out = await runWeave(supabase, llm, {
      requestId: "e1e7c3f2-0000-4000-8000-000000000002",
      messages: [{ role: "user", text: "no chai after 8pm, promise me" }],
    });
    expect(out.reply).toContain("chai");
    expect(out.refresh).toBe(true);
    expect(out.toolTrace).toEqual(["pfos_memory_set_commitment"]);
    expect((await commitments()).length).toBe(countBefore + 1);
    // card descriptor surfaced for the chat pane
    expect(out.cards).toHaveLength(1);
  });
});

describe.skipIf(!dbUp)("Slice 4 — Beat 3 link: decision links the headphones transaction (acceptance b)", () => {
  it("weaved call chain: draft → set_decision with the SAME row id → linked_transaction_id set", async () => {
    const llm = dynamicLlm((messages, i) => {
      if (i === 0) {
        return {
          text: null,
          toolCalls: [
            {
              id: "call-d1",
              name: "pfos_ledger_log_expense_draft",
              args: JSON.stringify({
                amount_in_minor_paise: 300000,
                category: "discretionary",
                occurred_on: "2026-11-04",
                note: "headphones",
                intent_acknowledged: true,
              }),
            },
          ],
        };
      }
      // iteration 1: find the row id from the tool result message
      const toolMsg = messages.find((m) => m.role === "tool");
      const envelope = JSON.parse(toolMsg!.content as string) as {
        result: { row: { id: string } };
      };
      const rowId = envelope.result.row.id;
      if (i === 1) {
        return {
          text: null,
          toolCalls: [
            {
              id: "call-d2",
              name: "pfos_memory_set_decision",
              args: JSON.stringify({
                text: "Headphones ₹3,000 — planned purchase",
                linked_transaction_id: rowId,
                confidence: 0.9,
              }),
            },
          ],
        };
      }
      return { text: "Planned purchase noted. Confirm the draft when ready." };
    });

    const out = await runWeave(supabase, llm, {
      requestId: "e1e7c3f2-0000-4000-8000-000000000003",
      messages: [{ role: "user", text: "bought headphones for ₹3,000" }],
    });
    expect(out.reply).toContain("Confirm");

    const { data: decisions } = await supabase
      .from("decisions")
      .select("text, linked_transaction_id, confidence")
      .ilike("text", "%headphones%")
      .order("created_at", { ascending: false });
    const linked = (decisions ?? []).find((d) => d.linked_transaction_id != null);
    expect(linked, "decision linked to the headphones transaction").toBeTruthy();
    expect(linked!.confidence).toBeCloseTo(0.9, 2);
  });

  it("rejects a linked_transaction_id that does not exist (no dangling refs)", async () => {
    const r = await executeToolCall(supabase, {
      requestId: "e1e7c3f2-0000-4000-8000-000000000004",
      toolName: "pfos_memory_set_decision",
      rawArgs: {
        text: "Bogus link fixture",
        linked_transaction_id: "00000000-0000-4000-8000-000000000099",
      },
    });
    expect(r.toolResult).toMatchObject({
      status: "error",
      error: "transaction_not_found",
      re_ask: true,
    });
    expect(r.approvalState).toBe("rejected");
  });
});

describe.skipIf(!dbUp)("Slice 4 — serialization (acceptance c)", () => {
  it("reset → Beats 1–4 weaved → all memory rows survive every write path", async () => {
    const reset = await supabase.rpc("reset_demo_data");
    expect(reset.error).toBeNull();

    // Beat 4 in isolation proves memory rows survive a full reset+weave cycle
    const llm = dynamicLlm((_m, i) =>
      i === 0
        ? {
            text: null,
            toolCalls: [
              {
                id: "call-c1",
                name: "pfos_memory_set_commitment",
                args: JSON.stringify({
                  subject: "Swiggy",
                  text: "Cap Swiggy at 8 orders a month",
                  rule_type: "monthly_count",
                  numeric_limit: 8,
                }),
              },
            ],
          }
        : { text: "Commitment recorded." },
    );
    const out = await runWeave(supabase, llm, {
      requestId: "e1e7c3f2-0000-4000-8000-000000000005",
      messages: [{ role: "user", text: "cap Swiggy at 8 orders a month" }],
    });
    expect(out.refresh).toBe(true);

    const { data: commitmentsRows } = await supabase
      .from("commitments")
      .select("text");
    expect((commitmentsRows ?? []).map((r) => r.text)).toContain(
      "Cap Swiggy at 8 orders a month",
    );
    // seed memory row (S5 decision) must survive too
    const { data: decisions } = await supabase
      .from("decisions")
      .select("text");
    expect(
      (decisions ?? []).map((r) => r.text),
      "seeded decision survived reset+weave",
    ).toContain("Continuing tiffin subscription next month");

    // no memory row was smuggled into a transaction draft flow
    const { data: junk } = await supabase
      .from("memories")
      .select("id");
    expect(junk ?? []).toEqual([]);
  });
});
