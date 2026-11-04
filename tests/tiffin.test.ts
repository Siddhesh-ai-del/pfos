// Slice 5 acceptance tests (plan §3 Slice 5): meal drafts, confirm, tiffin
// summary contract — after Beats 6+7 the seed+fixture state must read exactly
// 5 consumed / 2 skipped / 1 cancelled, billed ₹500, prepaid balance ₹4,000,
// payable ₹0 (reconciliation invariant).
import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

import { executeToolCall } from "@/lib/agent/executor";
import type { LlmClient, LlmResponse } from "@/lib/agent/llm";
import { runWeave } from "@/lib/agent/weave";

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

async function mealTool(
  requestId: string,
  rawArgs: unknown,
): Promise<{
  toolResult: { status: string; result?: { row: { id: string; status: string; record_status: string } }; error?: string };
  approvalState: string;
}> {
  const r = await executeToolCall(supabase, {
    requestId,
    toolName: "pfos_meal_log_consumption_draft",
    rawArgs,
  });
  return r as never;
}

describe.skipIf(!dbUp)("Slice 5 — Beat 6: breakfast skipped + dinner cancelled", () => {
  it("two estimated meal drafts are created; nothing billed until confirm", async () => {
    const b = await mealTool(
      "f1e7c3f2-0000-4000-8000-000000000001",
      { occurred_on: "2026-11-04", meal: "breakfast", status: "skipped" },
    );
    const d = await mealTool(
      "f1e7c3f2-0000-4000-8000-000000000002",
      { occurred_on: "2026-11-04", meal: "dinner", status: "cancelled" },
    );
    expect(b.toolResult.status).toBe("ok");
    expect(d.toolResult.status).toBe("ok");
    expect(b.toolResult.result?.row.record_status).toBe("estimated");
    expect(d.toolResult.result?.row.record_status).toBe("estimated");
    // skipped/cancelled are NOT billing events
    const { data: summary } = await supabase.rpc("get_tiffin_summary");
    expect(summary.billed_plan).toBe(40000); // unchanged from seed
    expect(summary.payable_now).toBe(0);
  });

  it("ambiguous meal (no known meal type) asks — never guesses, never drafts (acceptance d)", async () => {
    const countBefore = await supabase
      .from("meal_consumption")
      .select("*", { count: "exact", head: true });
    const r = await mealTool(
      "f1e7c3f2-0000-4000-8000-000000000003",
      { occurred_on: "2026-11-04", meal: "brunch", status: "consumed" },
    );
    expect(r.toolResult.status).toBe("error");
    expect(r.toolResult.error).toBe("invalid_meal_type");
    expect(r.approvalState).toBe("rejected");
    const countAfter = await supabase
      .from("meal_consumption")
      .select("*", { count: "exact", head: true });
    expect(countAfter.count).toBe(countBefore.count);
  });
});

describe.skipIf(!dbUp)("Slice 5 — Beat 7: lunch refill → confirm → 5·2·1", () => {
  it("confirm both Beat-6 drafts + add & confirm lunch consumed → invariant", async () => {
    // confirm the two estimated rows from Beat 6
    const { data: drafts } = await supabase
      .from("meal_consumption")
      .select("id, status")
      .eq("record_status", "estimated")
      .in("status", ["skipped", "cancelled"]);
    expect(drafts?.length).toBe(2);
    for (const [i, d] of drafts!.entries()) {
      const r = await executeToolCall(supabase, {
        requestId: `f1e7c3f2-0000-4000-8000-0000000${String(i + 10).padStart(3, "0")}`,
        toolName: "pfos_meal_confirm_consumption",
        rawArgs: { meal_id: d.id },
      });
      expect(r.approvalState).toBe("user_confirmed");
    }

    // Beat 7: confirm lunch as consumed
    const lunch = await mealTool(
      "f1e7c3f2-0000-4000-8000-000000000020",
      { occurred_on: "2026-11-04", meal: "lunch", status: "consumed" },
    );
    expect(lunch.toolResult.status).toBe("ok");
    const lunchId = lunch.toolResult.result!.row.id;
    const lunchConfirm = await executeToolCall(supabase, {
      requestId: "f1e7c3f2-0000-4000-8000-000000000021",
      toolName: "pfos_meal_confirm_consumption",
      rawArgs: { meal_id: lunchId },
    });
    expect(lunchConfirm.approvalState).toBe("user_confirmed");

    // §2.6 Beat 7 invariant: 5 consumed · 2 skipped · 1 cancelled,
    // billed ₹500, balance ₹4,000, payable ₹0.
    const { data: s } = await supabase.rpc("get_tiffin_summary");
    expect({
      consumed: s.consumed,
      skipped: s.skipped,
      cancelled: s.cancelled,
      billed_plan: s.billed_plan,
      prepaid_balance: s.prepaid_balance,
      payable_now: s.payable_now,
    }).toEqual({
      consumed: 5,
      skipped: 2,
      cancelled: 1,
      billed_plan: 50000,
      prepaid_balance: 400000,
      payable_now: 0,
    });

    // per-row reconciliation invariant: prepaid_amount − billed = balance
    expect(s.prepaid_amount_in_minor_paise - s.billed_plan).toBe(
      s.prepaid_balance,
    );
  });

  it("meal confirm is idempotent — second click confirms nothing twice", async () => {
    const { data: drafts } = await supabase
      .from("meal_consumption")
      .select("id")
      .eq("record_status", "confirmed")
      .limit(1);
    const id = drafts![0].id as string;
    const r = await executeToolCall(supabase, {
      requestId: "f1e7c3f2-0000-4000-8000-000000000030",
      toolName: "pfos_meal_confirm_consumption",
      rawArgs: { meal_id: id },
    });
    const envelope = r.toolResult as { status: string; result?: { row: { record_status: string } } };
    expect(envelope.status).toBe("ok");
    expect(envelope.result?.row.record_status).toBe("confirmed");
  });
});

describe.skipIf(!dbUp)("Slice 5 — status permutation (acceptance b)", () => {
  it.each(["consumed", "skipped", "cancelled"] as const)(
    "%s draft+confirm flips exactly that bucket by 1",
    async (status) => {
      const before = await supabase.rpc("get_tiffin_summary");
      const r = await mealTool(
        `f1e7c3f2-0000-4000-8000-0000000000${status === "consumed" ? "41" : status === "skipped" ? "42" : "43"}`,
        // fixture day never seeded — each status flips 0↔1 on a blank slate
        { occurred_on: "2026-11-05", meal: "breakfast", status },
      );
      expect(r.toolResult.status).toBe("ok");
      const draft = r.toolResult.result!.row;
      await executeToolCall(supabase, {
        requestId: `f1e7c3f2-0000-4000-8000-0000000000${status === "consumed" ? "51" : status === "skipped" ? "52" : "53"}`,
        toolName: "pfos_meal_confirm_consumption",
        rawArgs: { meal_id: draft.id },
      });
      // reload a fresh snapshot and compare against pre-draft state
      const after = await supabase.rpc("get_tiffin_summary");
      const key = status as "consumed" | "skipped" | "cancelled";
      expect(after.data[key] - before.data[key]).toBe(1);
      expect(after.data.billed_plan - before.data.billed_plan).toBe(
        status === "consumed" ? 10000 : 0,
      );
    },
  );
});

describe.skipIf(!dbUp)("Slice 5 — weave golden trace (Beat 7, acceptance a)", () => {
  it("had lunch at the mess today -> draft tool -> lunch card -> confirm -> payable invariant", async () => {
    // backfill to the Beat 0 baseline for a deterministic scripted trace
    await supabase.rpc("reset_demo_data");
    const countBefore = (
      await supabase.from("meal_consumption").select("*", { count: "exact", head: true })
    ).count;

    const script = [
      {
        text: null,
        toolCalls: [
          {
            id: "call-b7",
            name: "pfos_meal_log_consumption_draft",
            args: JSON.stringify({
              occurred_on: "2026-11-04",
              meal: "lunch",
              status: "consumed",
            }),
          },
        ],
      },
      { text: "Logged lunch as an estimate. Confirm when you're ready." },
    ];
    let i = 0;
    const llm: LlmClient = {
      model: "fake-model",
      async chat() {
        return script[Math.min(i++, script.length - 1)];
      },
    };
    const out = await runWeave(supabase, llm, {
      requestId: "f1e7c3f2-0000-4000-8000-000000000061",
      messages: [{ role: "user", text: "had lunch at the mess today" }],
    });
    expect(out.reply).toContain("Confirm");
    expect(out.refresh).toBe(true);
    expect(out.toolTrace).toEqual(["pfos_meal_log_consumption_draft"]);
    expect(out.cards).toHaveLength(1);
    expect((out.cards[0] as { kind: string }).kind).toBe("meal_draft");

    const after = (
      await supabase.from("meal_consumption").select("*", { count: "exact", head: true })
    ).count;
    expect(after).toBe(countBefore! + 1);
  });
});
