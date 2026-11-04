// Slice 6 acceptance tests (plan §3 Slice 6): Beats 8 & 9, LLM sabotage,
// round-off invariant, empty month. RPC-derived numbers only — no model math.
import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

import { executeToolCall } from "@/lib/agent/executor";
import { runWeave } from "@/lib/agent/weave";
import type { LlmClient, LlmResponse } from "@/lib/agent/llm";

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

// Determinate fixture: ₹120 food + ₹3,000 discretionary confirmed on Nov 4 →
// daily report pairs are ₹3,120 and monthly lands on ₹4,565 (§2.7 invariant).
async function seedDemoDay() {
  for (const [i, t] of [
    { amount: 12000, category: "food", note: "lunch" },
    { amount: 300000, category: "discretionary", note: "headphones" },
  ].entries()) {
    const r = await executeToolCall(supabase, {
      requestId: `f7e7c3f2-0000-4000-8000-0000000000${String(i + 1).padStart(3, "0")}`,
      toolName: "pfos_ledger_log_expense_draft",
      rawArgs: {
        amount_in_minor_paise: t.amount,
        category: t.category,
        occurred_on: "2026-11-04",
        note: t.note,
        intent_acknowledged: true,
      },
    });
    const row = (r.toolResult as { result: { row: { id: string } } }).result.row;
    await executeToolCall(supabase, {
      requestId: `f7e7c3f2-0000-4000-8000-0000000001${i}`,
      toolName: "pfos_ledger_confirm_transaction",
      rawArgs: { transaction_id: row.id },
    });
  }
}

async function report(
  requestId: string,
  period: string,
  type: "daily" | "monthly",
) {
  return executeToolCall(supabase, {
    requestId,
    toolName: "pfos_ledger_get_report",
    rawArgs: { period, type },
  });
}

describe.skipIf(!dbUp)("Slice 6 — Beats 8 & 9 (acceptance a+c)", () => {
  beforeAll(async () => {
    if (!dbUp) return;
    await seedDemoDay();
  });

  it("daily report for 2026-11-04: expenses_total ₹3,120, by_category, budget flips Discretionary over by ₹2,500", async () => {
    const r = await report(
      "f7e7c3f2-0000-4000-8000-0000000000a1",
      "2026-11-04",
      "daily",
    );
    expect(r.approvalState).toBe("auto");
    const envelope = r.toolResult as {
      status: string;
      result: {
        row: {
          day: string;
          expenses_total: number;
          by_category: Array<{ category: string; total: number }>;
          budget_status: Array<{ name: string; remaining_or_over: number | null }>;
        };
      };
    };
    expect(envelope.status).toBe("ok");
    const row = envelope.result.row;
    expect(row.expenses_total).toBe(312000);
    const byCat = Object.fromEntries(
      row.by_category.map((c) => [c.category, c.total]),
    );
    expect(byCat.food).toBe(12000);
    expect(byCat.discretionary).toBe(300000);
    const disc = row.budget_status.find((b) => b.name === "discretionary");
    expect(disc?.remaining_or_over).toBe(-250000); // over by ₹2,500
  });

  it("monthly report for 2026-11: ₹4,565 = 45% of October, categories food 147000 + disc 300000 + transp 9500 (acceptance c)", async () => {
    const r = await report(
      "f7e7c3f2-0000-4000-8000-0000000000a2",
      "2026-11",
      "monthly",
    );
    const envelope = r.toolResult as {
      status: string;
      result: {
        row: {
          expenses: number;
          income: number;
          by_category: Array<{ category: string; total: number }>;
          prev_month: { expenses: number };
        };
      };
    };
    expect(envelope.status).toBe("ok");
    const row = envelope.result.row;
    expect(row.expenses).toBe(456500);
    expect(row.income).toBe(0);
    expect(row.prev_month.expenses).toBe(1020000);

    // round-off invariant: sum of expense category totals == grand total
    const sum = row.by_category.reduce((acc, c) => acc + c.total, 0);
    expect(sum).toBe(row.expenses);

    const byCat = Object.fromEntries(
      row.by_category.map((c) => [c.category, c.total]),
    );
    expect(byCat.food).toBe(147000);
    expect(byCat.discretionary).toBe(300000);
    expect(byCat.transport).toBe(9500);
  });

  it("recurring candidates: food & transport present from both months", async () => {
    const r = await report(
      "f7e7c3f2-0000-4000-8000-0000000000a3",
      "2026-11",
      "monthly",
    );
    const row = (r.toolResult as { result: { row: { recurring_candidates: Array<{ label: string }> } } })
      .result.row;
    const labels = (row.recurring_candidates ?? []).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["food", "transport"]));
  });
});

describe.skipIf(!dbUp)("Slice 6 — empty month (acceptance d)", () => {
  it("a blank January snapshot renders zeros, [] categories, no violations", async () => {
    const r = await report(
      "f7e7c3f2-0000-4000-8000-0000000000b1",
      "2026-01",
      "monthly",
    );
    expect(r.toolResult).toMatchObject({ status: "ok" });
    const row = (r.toolResult as { result: { row: Record<string, unknown> } })
      .result.row;
    expect(row.expenses).toBe(0);
    expect(row.by_category).toEqual([]);
    expect(row.budget_violations).toEqual([]);
    expect(row.recurring_candidates).toEqual([]);
  });
});

describe.skipIf(!dbUp)("Slice 6 — LLM sabotage (acceptance b)", () => {
  it("a model that screams 9999 injects nothing into the report card payload", async () => {
    const sabotageLlm: LlmClient = {
      model: "sabotage-model",
      async chat(messages): Promise<LlmResponse> {
        // The model will claim a made-up figure; the card must not carry it.
        const toolCall = {
          id: "sab-1",
          name: "pfos_ledger_get_report",
          args: JSON.stringify({ period: "2026-11", type: "monthly" }),
        };
        // First call: invoke the report tool; second: scream 9999 in prose.
        const already = messages.filter((m) => m.role === "tool").length;
        if (already === 0) return { text: null, toolCalls: [toolCall] };
        return {
          text: "The report says you spent 9999 and that is definitely the answer.",
        };
      },
    };
    const out = await runWeave(supabase, sabotageLlm, {
      requestId: "f7e7c3f2-0000-4000-8000-0000000000c1",
      messages: [{ role: "user", text: "how's my month looking?" }],
    });
    const serialized = JSON.stringify(out.cards);
    expect(serialized).not.toContain("9999");
    // report tool executes successfully → rail re-reads (refresh allowed)
    expect(out.refresh).toBe(true); // cards never carry model tokens though
    expect(out.cards.length).toBe(1);
    // card payload only carries RPC tokens — verify an actual figure from the fixture is present
    expect(serialized).toContain("456500");
    expect(out.reply).toContain("9999"); // model said it, but the card never did
  });
});
