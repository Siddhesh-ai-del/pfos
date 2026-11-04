// Post-review regression tests: RPC jsonb failures must map to tool_error
// (never success), and replays must be transactional (row-level idempotency).
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

beforeAll(async () => {
  if (!dbUp) return;
  supabase = createClient(URL, KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const res = await supabase.rpc("reset_demo_data");
  expect(res.error).toBeNull();
});

describe.skipIf(!dbUp)("review regressions", () => {
  it("rpc-in-body error maps to tool_error(rejected), not success", async () => {
    // invalid_category at the RPC body level (category validated only in SQL for
    // the direct path; via executor the enum is zod'd, so use a fake confirm id)
    const r = await executeToolCall(supabase, {
      requestId: "2a2b3c4d-0000-4000-8000-000000000001",
      toolName: "pfos_ledger_confirm_transaction",
      rawArgs: { transaction_id: "00000000-0000-4000-8000-000000000099" },
    });
    expect(r.approvalState).toBe("rejected");
    expect((r.toolResult as { error?: string }).error).toBe(
      "transaction_not_found",
    );
    expect(r.card).toBeUndefined();
  });

  it("same logical draft twice = one row (transactional idempotency)", async () => {
    const args = {
      amount_in_minor_paise: 45000,
      category: "transport",
      occurred_on: "2026-11-06",
      note: "same draft twice",
      idempotency_key: "2a2b3c4d-0000-4000-8000-000000000010",
    };
    const first = await executeToolCall(supabase, {
      requestId: "2a2b3c4d-0000-4000-8000-000000000011",
      toolName: "pfos_ledger_log_expense_draft",
      rawArgs: args,
    });
    const second = await executeToolCall(supabase, {
      requestId: "2a2b3c4d-0000-4000-8000-000000000012",
      toolName: "pfos_ledger_log_expense_draft",
      rawArgs: args,
    });
    expect(first.approvalState).toBe("auto");
    expect(second.approvalState).toBe("auto");
    const { data } = await supabase
      .from("transactions")
      .select("id")
      .eq("note", "same draft twice");
    expect(data).toHaveLength(1);
  });

  it("replay returns the originally persisted row, verbatim (same id)", async () => {
    const args = {
      amount_in_minor_paise: 47000,
      category: "transport",
      occurred_on: "2026-11-06",
      note: "same draft twice lookup",
      idempotency_key: "2a2b3c4d-0000-4000-8000-000000000020",
    };
    const first = (await executeToolCall(supabase, {
      requestId: "2a2b3c4d-0000-4000-8000-000000000021",
      toolName: "pfos_ledger_log_expense_draft",
      rawArgs: args,
    })).card as { id: string };
    const second = (await executeToolCall(supabase, {
      requestId: "2a2b3c4d-0000-4000-8000-000000000022",
      toolName: "pfos_ledger_log_expense_draft",
      rawArgs: { ...args, note: "different note, same key" }, // args differ, key same
    })).card as { id: string };
    expect(second.id).toBe(first.id);
  });

  it("unknown-tool hasOwn check: 'constructor' is not a tool", async () => {
    const r = await executeToolCall(supabase, {
      requestId: "2a2b3c4d-0000-4000-8000-000000000031",
      toolName: "constructor",
      rawArgs: {},
    });
    expect((r.toolResult as { error?: string }).error).toBe("unknown_tool");
  });
});
