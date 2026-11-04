// Slice 7 (§3 Slice 7c): one logical Confirm = one audit row, regardless of
// how many times the user clicks (each click carries a fresh requestId).
import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

import { executeToolCall } from "@/lib/agent/executor";

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

async function auditCount(tool: string) {
  const { count, error } = await supabase
    .from("audit_log")
    .select("*", { count: "exact", head: true })
    .eq("tool_name", tool)
    .eq("approval_state", "user_confirmed");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

beforeAll(async () => {
  if (!dbUp) return;
  supabase = createClient(URL, KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const res = await supabase.rpc("reset_demo_data");
  expect(res.error).toBeNull();
});

describe.skipIf(!dbUp)("Slice 7 — one logical Confirm = one audit row", () => {
  it("transaction confirm double-click collapses to a single audit row", async () => {
    const draft = await executeToolCall(supabase, {
      requestId: "1a2b3c4d-0000-4000-8000-000000000001",
      toolName: "pfos_ledger_log_expense_draft",
      rawArgs: {
        amount_in_minor_paise: 12000,
        category: "food",
        occurred_on: "2026-11-06",
        note: "audit fixture",
      },
    });
    const row = (draft.toolResult as { result: { row: { id: string } } })
      .result.row;

    for (const requestId of [
      "1a2b3c4d-0000-4000-8000-000000000002",
      "1a2b3c4d-0000-4000-8000-000000000003",
      "1a2b3c4d-0000-4000-8000-000000000004",
    ]) {
      await executeToolCall(supabase, {
        requestId,
        toolName: "pfos_ledger_confirm_transaction",
        rawArgs: { transaction_id: row.id },
      });
    }

    expect(await auditCount("pfos_ledger_confirm_transaction")).toBe(1);

    const { data: txns } = await supabase
      .from("transactions")
      .select("status")
      .eq("note", "audit fixture");
    expect(txns).toHaveLength(1);
    expect(txns![0].status).toBe("confirmed");
  });

  it("meal confirm double-click collapses to a single audit row", async () => {
    const draft = await executeToolCall(supabase, {
      requestId: "1a2b3c4d-0000-4000-8000-000000000101",
      toolName: "pfos_meal_log_consumption_draft",
      rawArgs: { occurred_on: "2026-11-06", meal: "lunch", status: "consumed" },
    });
    const row = (draft.toolResult as { result: { row: { id: string } } })
      .result.row;

    for (const requestId of [
      "1a2b3c4d-0000-4000-8000-000000000102",
      "1a2b3c4d-0000-4000-8000-000000000103",
    ]) {
      await executeToolCall(supabase, {
        requestId,
        toolName: "pfos_meal_confirm_consumption",
        rawArgs: { meal_id: row.id },
      });
    }

    expect(await auditCount("pfos_meal_confirm_consumption")).toBe(1);
  });
});
