// Executor (§5.4): the single server-side dispatcher. The ONLY place a tool
// call becomes a Supabase RPC. Validates against the zod whitelist, gates
// unreleased tools, wraps results verbatim in an envelope, writes audit_log.
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TOOL_SCHEMAS, type ToolName } from "./tools";
import { TOOL_DEFS, RELEASED_TOOLS } from "./tool-defs";
import { DEMO_USER_ID } from "@/lib/demo";

export type ExecResult = {
  // verbatim-from-Postgres envelope: {status:'ok', result: <jsonb>} or structured error
  toolResult: unknown;
  approvalState: "auto" | "user_confirmed" | "rejected";
  error: boolean;
};

export type ExecContext = {
  requestId: string;
  toolName: string;
  rawArgs: unknown;
};

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function canonicalJson(v: unknown): string {
  // stable key order for idempotency keys
  return JSON.stringify(v, Object.keys(v as object).sort());
}

function errResult(
  code: string,
  extra?: Record<string, unknown>
): unknown {
  return { status: "error", error: code, re_ask: true, ...extra };
}

export async function writeAudit(
  supabase: SupabaseClient,
  row: {
    tool_name: string;
    args: unknown;
    model?: string;
    result_digest?: string | null;
    result?: unknown;
    approval_state: "auto" | "user_confirmed" | "rejected";
    latency_ms?: number | null;
    error: boolean;
    idempotency_key: string;
    request_id: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from("audit_log")
    .insert({ ...row, route: "/api/agent" });
  if (error) {
    // never fail the user turn because of the audit write; but do surface loudly in server logs
    console.error("audit_log insert failed:", error.message);
  }
}

export async function executeToolCall(
  supabase: SupabaseClient,
  ctx: ExecContext
): Promise<ExecResult> {
  const { toolName, rawArgs, requestId: reqId } = ctx;
  const model = process.env.OPENROUTER_MODEL ?? undefined;

  // 1) Unknown tool → tool_error + audit(rejected). No RPC ever runs.
  if (!(toolName in TOOL_SCHEMAS)) {
    await writeAudit(supabase, {
      tool_name: "unknown",
      args: { requested: toolName, args: rawArgs ?? null },
      model,
      approval_state: "rejected",
      error: true,
      idempotency_key: sha256(`unknown|${toolName}|${reqId}`),
      request_id: reqId,
    });
    return {
      toolResult: errResult("unknown_tool", {
        allowed: [...RELEASED_TOOLS],
      }),
      approvalState: "rejected",
      error: true,
    };
  }

  // 2) Known but not yet released (slice gating) → still a graceful tool_error.
  if (!RELEASED_TOOLS.has(toolName as ToolName)) {
    await writeAudit(supabase, {
      tool_name: toolName,
      args: { requested: toolName, args: rawArgs ?? null },
      model,
      approval_state: "rejected",
      error: true,
      idempotency_key: sha256(`unreleased|${toolName}|${reqId}`),
      request_id: reqId,
    });
    return {
      toolResult: errResult("tool_not_released", {
        available: [...RELEASED_TOOLS],
      }),
      approvalState: "rejected",
      error: true,
    };
  }

  // 3) zod validation (the trust anchor — §5.3)
  const parsed = TOOL_SCHEMAS[toolName as ToolName].safeParse(rawArgs ?? {});
  if (!parsed.success) {
    await writeAudit(supabase, {
      tool_name: toolName,
      args: { requested: rawArgs ?? null, issues: parsed.error.issues.slice(0, 4) },
      model,
      approval_state: "rejected",
      error: true,
      idempotency_key: sha256(`badargs|${toolName}|${reqId}`),
      request_id: reqId,
    });
    return {
      toolResult: errResult("bad_args"),
      approvalState: "rejected",
      error: true,
    };
  }

  // 4) Execute the matching RPC. ctx.requestId feeds the idempotency key.
  const idemKey = sha256(
    `${toolName}|${canonicalJson(parsed.data)}|${DEMO_USER_ID}|${reqId}`
  );
  const t0 = Date.now();
  let rpcName: string;
  const args: Record<string, unknown> = {};

  switch (toolName as ToolName) {
    case "pfos_ledger_get_financial_context":
      rpcName = "get_financial_context";
      break;
    default:
      // unreachable while RELEASED_TOOLS only contains the above
      rpcName = "get_financial_context";
  }

  const { data, error } = await supabase.rpc(rpcName, args);
  const latency = Date.now() - t0;

  const toolResult = error
    ? errResult("rpc_failed", { detail: error.message.slice(0, 200) })
    : { status: "ok", result: data };

  const resultDigest = sha256(JSON.stringify(toolResult)).slice(0, 32);

  await writeAudit(supabase, {
    tool_name: toolName,
    args: parsed.data,
    model,
    result_digest: resultDigest,
    result: toolResult,
    approval_state: "auto",
    latency_ms: latency,
    error: Boolean(error),
    idempotency_key: idemKey,
    request_id: reqId,
  });

  return {
    toolResult,
    approvalState: "auto",
    error: Boolean(error),
  };
}
