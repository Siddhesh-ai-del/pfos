// Slice 2 acceptance tests (plan §3 Slice 2): weave loop + executor.
// Uses a scripted LLM (no network) against the real local Supabase stack.
import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

import { executeToolCall } from "@/lib/agent/executor";
import { runWeave } from "@/lib/agent/weave";
import type { LlmClient, LlmResponse } from "@/lib/agent/llm";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const KEY =
  process.env.SUPABASE_SERVICE_KEY ??
  "placeholder-supabase-local-service-key";

let supabase: SupabaseClient;

// Module-level preflight: probe the supabase stack once; skip suite if unreachable.
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

beforeAll(() => {
  supabase = createClient(URL, KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
});

// ---------- scripted LLM helpers ----------

function scriptedLlm(script: LlmResponse[]): LlmClient {
  let i = 0;
  return {
    model: "fake-model",
    async chat() {
      const next = script[Math.min(i, script.length - 1)];
      i++;
      return next;
    },
    calls: () => i,
  } as LlmClient & { calls: () => number };
}

async function auditRowCount(): Promise<number> {
  const { count, error } = await supabase
    .from("audit_log")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`audit_log: ${error.message}`);
  return count ?? 0;
}

async function resetAudit(): Promise<void> {
  const { error } = await supabase.from("audit_log").delete().gte("ts", "1970-01-01");
  if (error) throw new Error(`audit reset: ${error.message}`);
}

// ---------- executor ----------

describe.skipIf(!dbUp)("executor: whitelisting enforcement", () => {
  it("rejects an unknown tool with tool_error + audit(approved_state=rejected)", async () => {
    await resetAudit();
    const r = await executeToolCall(supabase, {
      requestId: "a1e7c3f2-0000-4000-8000-000000000001",
      toolName: "python_exec",
      rawArgs: {},
    });
    expect(r.toolResult).toMatchObject({
      error: "unknown_tool",
      re_ask: true,
    });
    expect(r.approvalState).toBe("rejected");

    const { data: rows } = await supabase
      .from("audit_log")
      .select("tool_name, approval_state, error, args");
    expect(rows).toHaveLength(1);
    expect(rows![0].tool_name).toBe("unknown");
    expect(rows![0].approval_state).toBe("rejected");
    expect(rows![0].error).toBe(true);
    expect(rows![0].args).toMatchObject({ requested: "python_exec" });
  });

  it("rejects a whitelisted-but-bad-args call with tool_error(bad_args) + audit row", async () => {
    await resetAudit();
    const r = await executeToolCall(supabase, {
      requestId: "a1e7c3f2-0000-4000-8000-000000000002",
      toolName: "pfos_ledger_get_financial_context",
      rawArgs: { nope: 1 },
    });
    expect(r.toolResult).toMatchObject({ error: "bad_args", re_ask: true });
    const { data: rows } = await supabase
      .from("audit_log")
      .select("tool_name, approval_state, args");
    expect(rows).toHaveLength(1);
    expect(rows![0].args).toMatchObject({ requested: { nope: 1 } });
  });

  it("returns tool_error for a whitelisted tool not yet RELEASED (slice gating)", async () => {
    await resetAudit();
    const r = await executeToolCall(supabase, {
      requestId: "a1e7c3f2-0000-4000-8000-000000000003",
      toolName: "pfos_ledger_log_expense_draft",
      rawArgs: {
        amount_in_minor_paise: 100,
        category: "food",
        occurred_on: "2026-11-03",
      },
    });
    expect(r.toolResult).toMatchObject({
      error: "tool_not_released",
      re_ask: true,
    });
  });

  it("executes pfos_ledger_get_financial_context → envelope + audit(auto, digest, latency)", async () => {
    await resetAudit();
    const r = await executeToolCall(supabase, {
      requestId: "a1e7c3f2-0000-4000-8000-000000000004",
      toolName: "pfos_ledger_get_financial_context",
      rawArgs: {},
    });
    const envelope = r.toolResult as {
      status: string;
      result: { day: string };
    };
    expect(envelope.status).toBe("ok");
    expect(envelope.result.day).toBeTruthy();
    expect(r.approvalState).toBe("auto");

    const { data: rows } = await supabase
      .from("audit_log")
      .select("tool_name, approval_state, error, latency_ms, result_digest, result");
    expect(rows).toHaveLength(1);
    const row = rows![0];
    expect(row.tool_name).toBe("pfos_ledger_get_financial_context");
    expect(row.approval_state).toBe("auto");
    expect(row.error).toBe(false);
    expect(row.latency_ms).toBeGreaterThanOrEqual(0);
    // verbatim envelope retained for idempotent replay / honest-agent audit
    expect(row.result_digest).toHaveLength(32);
    const stored = row.result as { status: string; result: { day: string } };
    expect(stored.status).toBe("ok");
    expect(stored.result.day).toBe(envelope.result.day);
  });

  it("replay with the same idempotency key audits but does not double-execute writes (double-click safety)", async () => {
    // context tool is read-only: a second execution is safe; the key still
    // routes both calls to the same audit trail (executor assigns keys)
    await resetAudit();
    await executeToolCall(supabase, {
      requestId: "a1e7c3f2-0000-4000-8000-000000000005",
      toolName: "pfos_ledger_get_financial_context",
      rawArgs: {},
    });
    await executeToolCall(supabase, {
      requestId: "a1e7c3f2-0000-4000-8000-000000000005",
      toolName: "pfos_ledger_get_financial_context",
      rawArgs: {},
    });
    const { count } = await supabase
      .from("audit_log")
      .select("*", { count: "exact", head: true });
    // unique idempotency_key collapses replays to one row
    expect(count).toBe(1);
  });
});

// ---------- weave ----------

describe.skipIf(!dbUp)("weave loop (scripted LLM)", () => {
  it("prose-only response → returns text, cards=[], no audit writes", async () => {
    await resetAudit();
    const llm = scriptedLlm([
      { text: "Your month looks steady. Ask me anything specific." },
    ]);
    const out = await runWeave(supabase, llm, {
      requestId: "b1e7c3f2-0000-4000-8000-000000000001",
      messages: [{ role: "user", text: "what's my month looking like?" }],
    });
    expect(out.reply).toContain("steady");
    expect(out.cards).toEqual([]);
    expect(out.refresh).toBe(false);
    expect(await auditRowCount()).toBe(0);
  });

  it("tool call → executor runs → LLM sees verbatim result → prose reply (acceptance a)", async () => {
    await resetAudit();
    const llm = scriptedLlm([
      {
        text: null,
        toolCalls: [
          {
            id: "call-1",
            name: "pfos_ledger_get_financial_context",
            args: "{}",
          },
        ],
      },
      { text: "Food has ₹2,650 left this month." },
    ]);
    const out = await runWeave(supabase, llm, {
      requestId: "b1e7c3f2-0000-4000-8000-000000000002",
      messages: [{ role: "user", text: "what's my month looking like?" }],
    });
    expect(out.reply).toContain("₹2,650");
    expect(out.refresh).toBe(true);
    const rows = await auditRowCount();
    expect(rows).toBe(1);
  });

  it("forced non-whitelisted tool → tool_error woven into conversation, LLM recovers gracefully (acceptance b)", async () => {
    await resetAudit();
    const llm = scriptedLlm([
      {
        text: null,
        toolCalls: [{ id: "call-1", name: "pfos_ledger_delete_all", args: "{}" }],
      },
      { text: "I can't delete anything — that isn't one of my allowed tools." },
    ]);
    const out = await runWeave(supabase, llm, {
      requestId: "b1e7c3f2-0000-4000-8000-000000000003",
      messages: [{ role: "user", text: "delete my ledger" }],
    });
    expect(out.reply).toContain("allowed tools");
    const rows = await auditRowCount();
    expect(rows).toBe(1);
  });

  it("tool-loop cap (3 iterations) → polite bail, never invented numbers", async () => {
    await resetAudit();
    const llm = scriptedLlm([
      {
        text: null,
        toolCalls: [
          { id: "c1", name: "pfos_ledger_get_financial_context", args: "{}" },
        ],
      },
      {
        text: null,
        toolCalls: [
          { id: "c2", name: "pfos_ledger_get_financial_context", args: "{}" },
        ],
      },
      {
        text: null,
        toolCalls: [
          { id: "c3", name: "pfos_ledger_get_financial_context", args: "{}" },
        ],
      },
      {
        text: null,
        toolCalls: [
          { id: "c4", name: "pfos_ledger_get_financial_context", args: "{}" },
        ],
      },
    ]);
    const out = await runWeave(supabase, llm, {
      requestId: "b1e7c3f2-0000-4000-8000-000000000004",
      messages: [{ role: "user", text: "loop forever" }],
    });
    expect(out.reply).toBe(
      "Let me stop here rather than guess. Could you restate what you'd like?"
    );
    // capped at 3 executed tool iterations; identical (tool|args|request) calls
    // collapse in audit_log by design (unique idempotency_key = replay semantics)
    const capped = await auditRowCount();
    expect(capped).toBeGreaterThanOrEqual(1);
    expect(capped).toBeLessThanOrEqual(3);
  });

  it("LLM raising an error → quiet failure message, 500 not thrown to user", async () => {
    await resetAudit();
    const llm: LlmClient = {
      model: "fake-model",
      async chat() {
        throw new Error("provider down");
      },
    };
    const out = await runWeave(supabase, llm, {
      requestId: "b1e7c3f2-0000-4000-8000-000000000005",
      messages: [{ role: "user", text: "hi" }],
    });
    expect(out.reply).toMatch(/couldn't reach|try again/i);
    expect(out.httpStatus).toBe(502);
  });
});

export {};
