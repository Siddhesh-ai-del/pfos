// Slice 3 acceptance tests (plan §3 Slice 3): draft→confirm→live budget +
// executor-side overflow gate (the headphone moment) + Confirm idempotency.
// Scripted fake LLM against the real local Supabase stack.
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
  // Canonical §2.3 seed before the suite — capture tests create chat rows
  // on purpose, and the suite must be re-run-safe on a shared local DB.
  const res = await supabase.rpc("reset_demo_data");
  expect(res.error).toBeNull();
});

function scriptedLlm(script: LlmResponse[]): LlmClient {
  let i = 0;
  return {
    model: "fake-model",
    async chat() {
      const next = script[Math.min(i, script.length - 1)];
      i++;
      return next;
    },
  };
}

async function chatRows(): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("source", "chat")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`transactions: ${error.message}`);
  return data as Array<Record<string, unknown>>;
}

async function auditRowsFor(tool: string): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .eq("tool_name", tool)
    .order("ts", { ascending: false });
  if (error) throw new Error(`audit_log: ${error.message}`);
  return data as Array<Record<string, unknown>>;
}

describe.skipIf(!dbUp)("Slice 3 — executor capture tools", () => {
  it("Beat 1: non-discretionary draft creates an ESTIMATED transaction + budget snapshot envelope + audit(auto)", async () => {
    const r = await executeToolCall(supabase, {
      requestId: "c1e7c3f2-0000-4000-8000-000000000001",
      toolName: "pfos_ledger_log_expense_draft",
      rawArgs: {
        amount_in_minor_paise: 12000,
        category: "food",
        occurred_on: "2026-11-04",
        note: "lunch",
      },
    });
    const envelope = r.toolResult as {
      status: string;
      result: { row: { status: string; amount_in_minor_paise: number }; budget_snapshot: unknown[] };
    };
    expect(envelope.status).toBe("ok");
    expect(envelope.result.row.status).toBe("estimated");
    expect(envelope.result.row.amount_in_minor_paise).toBe(12000);
    // §5.2: budget data arrives inside the draft-tool envelope, never as a live tool
    expect(envelope.result.budget_snapshot).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "food" })])
    );
    const audits = await auditRowsFor("pfos_ledger_log_expense_draft");
    expect(audits[0].approval_state).toBe("auto");
    expect(audits.length).toBe(1);
  });

  it("Beat 2: headphone-class draft is INTERCEPTED — intent_required, NO row, audit(rejected), no confirm needed", async () => {
    const before = await chatRows();
    const r = await executeToolCall(supabase, {
      requestId: "c1e7c3f2-0000-4000-8000-000000000002",
      toolName: "pfos_ledger_log_expense_draft",
      rawArgs: {
        amount_in_minor_paise: 300000, // ₹3,000 — Discretionary remaining ₹500, over by ₹2,500
        category: "discretionary",
        occurred_on: "2026-11-04",
        note: "headphones",
      },
    });
    const envelope = r.toolResult as {
      status: string;
      display?: { category: string; budget: number; remaining: number; overflow: number };
      question?: string;
    };
    expect(envelope.status).toBe("intent_required");
    expect(envelope.display).toEqual({
      category: "discretionary",
      budget: 50000,
      remaining: 50000,
      overflow: 250000,
    });
    expect(envelope.question).toBe("Record as a planned purchase?");
    expect(r.approvalState).toBe("rejected");
    // zero new chat-sourced rows since the gate ran before ANY RPC write
    expect((await chatRows()).length - before.length).toBeLessThanOrEqual(0);
    const audits = await auditRowsFor("pfos_ledger_log_expense_draft");
    const latest = audits[0];
    expect(latest.approval_state).toBe("rejected");
    expect(latest.args).toMatchObject({ requested: { note: "headphones" } });
  });

  it("Beat 3: same call with intent_acknowledged:true creates the planned draft normally", async () => {
    const r = await executeToolCall(supabase, {
      requestId: "c1e7c3f2-0000-4000-8000-000000000003",
      toolName: "pfos_ledger_log_expense_draft",
      rawArgs: {
        amount_in_minor_paise: 300000,
        category: "discretionary",
        occurred_on: "2026-11-04",
        note: "headphones",
        intent_acknowledged: true,
      },
    });
    const envelope = r.toolResult as {
      status: string;
      result: { row: { status: string } };
    };
    expect(envelope.status).toBe("ok");
    expect(envelope.result.row.status).toBe("estimated");
  });

  it("small discretionary draft (≤ half remaining) is NOT gated", async () => {
    const r = await executeToolCall(supabase, {
      requestId: "c1e7c3f2-0000-4000-8000-000000000004",
      toolName: "pfos_ledger_log_expense_draft",
      rawArgs: {
        amount_in_minor_paise: 9000, // ₹90 ≤ ₹250 half-remaining
        category: "discretionary",
        occurred_on: "2026-11-04",
      },
    });
    const envelope = r.toolResult as {
      status: string;
      result: { row: { status: string } };
    };
    expect(envelope.status).toBe("ok");
    expect(envelope.result.row.status).toBe("estimated");
  });
});

describe.skipIf(!dbUp)("Slice 3 — Confirm idempotency (acceptance c)", () => {
  it("second confirm click = no duplicate row, stays confirmed once", async () => {
    await executeToolCall(supabase, {
      requestId: "c1e7c3f2-0000-4000-8000-000000000005",
      toolName: "pfos_ledger_log_expense_draft",
      rawArgs: {
        amount_in_minor_paise: 15000,
        category: "food",
        occurred_on: "2026-11-04",
        note: "idempotency fixture",
      },
    });
    const drafts = (await chatRows()).filter(
      (row) => row.note === "idempotency fixture" && row.status === "estimated"
    );
    expect(drafts).toHaveLength(1);
    const id = drafts[0].id as string;

    const confirmId = "c1e7c3f2-0000-4000-8000-000000000006";
    const first = await executeToolCall(supabase, {
      requestId: confirmId,
      toolName: "pfos_ledger_confirm_transaction",
      rawArgs: { transaction_id: id },
    });
    const second = await executeToolCall(supabase, {
      requestId: confirmId,
      toolName: "pfos_ledger_confirm_transaction",
      rawArgs: { transaction_id: id },
    });
    for (const click of [first, second]) {
      const envelope = click.toolResult as {
        status: string;
        result: { row: { status: string; confirmed_at: string | null } };
      };
      expect(envelope.status).toBe("ok");
      expect(envelope.result.row.status).toBe("confirmed");
      expect(envelope.result.row.confirmed_at).not.toBeNull();
      expect(click.approvalState).toBe("user_confirmed");
    }
    // exactly one confirmed row for the fixture; the draft did not duplicate
    const confirmed = (await chatRows()).filter(
      (row) => row.note === "idempotency fixture" && row.status === "confirmed"
    );
    expect(confirmed).toHaveLength(1);
  });
});

describe.skipIf(!dbUp)("Slice 3 — weave golden trace (acceptance a)", () => {
  it("Beat 1 weave: tool call → draft card in output → prose reply with verbatim number + refresh", async () => {
    const llm = scriptedLlm([
      {
        text: null,
        toolCalls: [
          {
            id: "call-b1",
            name: "pfos_ledger_log_expense_draft",
            args: JSON.stringify({
              amount_in_minor_paise: 12000,
              category: "food",
              occurred_on: "2026-11-04",
              note: "lunch beat",
            }),
          },
        ],
      },
      { text: "Logged ₹120 lunch as an estimate. Confirm when you're ready." },
    ]);
    const out = await runWeave(supabase, llm, {
      requestId: "d1e7c3f2-0000-4000-8000-000000000001",
      messages: [{ role: "user", text: "spent ₹120 on lunch today" }],
    });
    expect(out.reply).toContain("estimate");
    expect(out.refresh).toBe(true);
    expect(out.toolTrace).toEqual(["pfos_ledger_log_expense_draft"]);
    // one draft card surfaced to the UI
    expect(out.cards).toHaveLength(1);
    const card = out.cards[0] as {
      kind: string;
      id: string;
      amount_in_minor_paise: number;
      status: string;
    };
    expect(card.kind).toBe("transaction_draft");
    expect(card.amount_in_minor_paise).toBe(12000);
    expect(card.status).toBe("estimated");
  });
});
