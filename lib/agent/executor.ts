// Executor (§5.4): the single server-side dispatcher. The ONLY place a tool
// call becomes a Supabase RPC. Validates against the zod whitelist, gates
// unreleased tools, wraps results verbatim in an envelope, writes audit_log.
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TOOL_SCHEMAS, type ToolName } from "./tools";
import { TOOL_DEFS, RELEASED_TOOLS } from "./tool-defs";
import { DEMO_USER_ID } from "@/lib/demo";

export type TransactionCard = {
  kind: "transaction_draft" | "transaction_confirmed";
  id: string; // transactions.id — the Confirm button targets this
  amount_in_minor_paise: number;
  category: string | null;
  occurred_on: string; // YYYY-MM-DD
  note: string | null;
  status: "estimated" | "confirmed";
};

export type DraftCard = TransactionCard;

export type MemoryCard = {
  kind: "memory_note";
  id: string;
  memoryType: "decision" | "commitment";
  text: string;
  /** context line under the text (subject · rule / confidence) */
  sub: string | null;
};

export type MealCard = {
  kind: "meal_draft" | "meal_confirmed";
  id: string; // meal_consumption.id
  meal: string;
  status: "consumed" | "skipped" | "cancelled";
  occurred_on: string;
  note: string | null;
  record_status: "estimated" | "confirmed";
};

export type ExecResult = {
  // verbatim-from-Postgres envelope: {status:'ok', result: <jsonb>} or structured error
  toolResult: unknown;
  approvalState: "auto" | "user_confirmed" | "rejected";
  error: boolean;
  /** present when the tool created/confirmed a record — the UI renders a card */
  card?: DraftCard | MemoryCard | MealCard;
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

  // 3.5) Meal tools: resolve meal NAME → meal_types.id for the demo user.
  //      Unknown meals are refused outright — never guess what was eaten.
  let resolvedMealTypeId: string | null = null;
  if (toolName === "pfos_meal_log_consumption_draft") {
    const meal = (parsed.data as { meal: string }).meal;
    const { data: mt } = await supabase
      .from("meal_types")
      .select("id, name, default_price_in_minor_paise")
      .eq("user_id", DEMO_USER_ID)
      .eq("name", meal)
      .maybeSingle();
    if (!mt) {
      const { data: available } = await supabase
        .from("meal_types")
        .select("name")
        .eq("user_id", DEMO_USER_ID);
      await writeAudit(supabase, {
        tool_name: toolName,
        args: { requested: rawArgs ?? null, gate: "invalid_meal_type" },
        model,
        approval_state: "rejected",
        error: true,
        idempotency_key: sha256(`mealname|${meal}|${reqId}`),
        request_id: reqId,
      });
      return {
        toolResult: errResult("invalid_meal_type", {
          available: (available ?? []).map((m: { name: string }) => m.name),
        }),
        approvalState: "rejected",
        error: true,
      };
    }
    resolvedMealTypeId = (mt as { id: string }).id;
  }

  // 3.6) Memory tools: a linked_transaction_id must reference an existing
  //      demo-user transaction — no dangling decision refs, ever.
  if (toolName === "pfos_memory_set_decision") {
    const linked = (parsed.data as { linked_transaction_id?: string })
      .linked_transaction_id;
    if (linked) {
      const { data: tx, error: linkErr } = await supabase
        .from("transactions")
        .select("id, amount_in_minor_paise, note, occurred_on")
        .eq("id", linked)
        .eq("user_id", DEMO_USER_ID)
        .maybeSingle();
      if (linkErr || !tx) {
        await writeAudit(supabase, {
          tool_name: toolName,
          args: { requested: rawArgs ?? null, gate: "transaction_not_found" },
          model,
          approval_state: "rejected",
          error: true,
          idempotency_key: sha256(`badlink|${linked}|${reqId}`),
          request_id: reqId,
        });
        return {
          toolResult: errResult("transaction_not_found"),
          approvalState: "rejected",
          error: true,
        };
      }
    }
  }

  // 4) Execute the matching RPC (or the executor-side overflow gate, §5.5
  //    step 5, which may intercept a discretionary draft BEFORE any write).
  // ---- executor-side overflow gate: headphone-class discretionary drafts ----
  const t0 = Date.now();
  const idemKey = sha256(
    `${toolName}|${canonicalJson(parsed.data)}|${DEMO_USER_ID}|${reqId}`
  );

  const draftArgs = parsed.data as {
    category: string;
    amount_in_minor_paise: number;
    intent_acknowledged?: boolean | undefined;
  };

  if (
    toolName === "pfos_ledger_log_expense_draft" &&
    draftArgs.category === "discretionary" &&
    draftArgs.intent_acknowledged !== true
  ) {
    const { data: budgets, error: budgetErr } = await supabase.rpc(
      "get_budget_status"
    );
    if (!budgetErr) {
      const d = (budgets as Array<{
        name: string;
        budget: number | null;
        remaining_or_over: number | null;
      }>).find((b) => b.name === "discretionary");
      const remaining = d?.remaining_or_over;
      if (
        d?.budget != null &&
        remaining != null &&
        draftArgs.amount_in_minor_paise > remaining / 2
      ) {
        const gateResult = {
          status: "intent_required",
          display: {
            category: draftArgs.category,
            budget: d.budget,
            remaining,
            overflow: draftArgs.amount_in_minor_paise - remaining,
          },
          question: "Record as a planned purchase?",
        };
        await writeAudit(supabase, {
          tool_name: toolName,
          args: { requested: rawArgs ?? null, gate: "intent_required" },
          model,
          result: gateResult,
          approval_state: "rejected",
          latency_ms: Date.now() - t0,
          error: true,
          idempotency_key: idemKey,
          request_id: reqId,
        });
        return {
          toolResult: gateResult,
          approvalState: "rejected",
          error: true,
        };
      }
    }
  }

  let rpcName: string;
  const args: Record<string, unknown> = {};

  switch (toolName as ToolName) {
    case "pfos_ledger_get_financial_context":
      rpcName = "get_financial_context";
      break;
    case "pfos_ledger_log_expense_draft": {
      rpcName = "create_transaction_draft";
      const a = parsed.data as {
        kind: string;
        category: string;
        amount_in_minor_paise: number;
        occurred_on: string;
        note?: string;
        idempotency_key?: string;
      };
      args.p_kind = a.kind;
      args.p_category_name = a.category;
      args.p_amount_in_minor_paise = a.amount_in_minor_paise;
      args.p_occurred_on = a.occurred_on;
      args.p_note = a.note ?? null;
      args.p_source = "chat";
      // arg-level idempotency: model-supplied key or the computed one
      args.p_idempotency_key = a.idempotency_key ?? idemKey;
      break;
    }
    case "pfos_ledger_confirm_transaction": {
      rpcName = "confirm_transaction";
      const a = parsed.data as { transaction_id: string; idempotency_key?: string };
      args.p_transaction_id = a.transaction_id;
      args.p_idempotency_key = a.idempotency_key ?? idemKey;
      break;
    }
    case "pfos_meal_log_consumption_draft": {
      rpcName = "create_meal_consumption_draft";
      const a = parsed.data as {
        occurred_on: string;
        status: string;
        note?: string;
        idempotency_key?: string;
      };
      args.p_occurred_on = a.occurred_on;
      args.p_meal_type_id = resolvedMealTypeId; // resolved at 3.5; gates above
      args.p_status = a.status;
      args.p_note = a.note ?? null;
      args.p_source = "chat";
      args.p_idempotency_key = a.idempotency_key ?? idemKey;
      break;
    }
    case "pfos_meal_confirm_consumption": {
      rpcName = "confirm_meal_consumption";
      const a = parsed.data as { meal_id: string; idempotency_key?: string };
      args.p_meal_id = a.meal_id;
      args.p_idempotency_key = a.idempotency_key ?? idemKey;
      break;
    }
    case "pfos_memory_set_commitment": {
      rpcName = "create_commitment";
      const a = parsed.data as {
        subject: string;
        text: string;
        rule_type: string;
        numeric_limit?: number;
        idempotency_key?: string;
      };
      args.p_subject = a.subject;
      args.p_text = a.text;
      args.p_rule_type = a.rule_type;
      args.p_numeric_limit = a.numeric_limit ?? null;
      args.p_idempotency_key = a.idempotency_key ?? idemKey;
      break;
    }
    case "pfos_memory_set_decision": {
      rpcName = "create_decision";
      const a = parsed.data as {
        text: string;
        linked_transaction_id?: string;
        confidence?: number;
        idempotency_key?: string;
      };
      args.p_text = a.text;
      args.p_linked_transaction_id = a.linked_transaction_id ?? null;
      args.p_confidence = a.confidence ?? 0.8;
      args.p_idempotency_key = a.idempotency_key ?? idemKey;
      break;
    }
    default:
      // unreachable: RELEASED_TOOLS is kept in sync with this switch
      rpcName = "get_financial_context";
  }

  const { data, error } = await supabase.rpc(rpcName, args);

  // Draft-tool envelopes carry a budget snapshot (§5.2): the assistant phrases
  // spend context from the same deterministic numbers, without a live tool.
  // All write-path envelopes use the same {status:'ok', result:{row,...}} shape.
  let toolResult: unknown;
  if (!error && toolName === "pfos_ledger_log_expense_draft" && data != null) {
    const { data: budgets } = await supabase.rpc("get_budget_status");
    toolResult = { status: "ok", result: { row: data, budget_snapshot: budgets } };
  } else if (!error && toolName === "pfos_ledger_get_financial_context") {
    // pass through verbatim: budgets/txns/context for the LLM + rail
    toolResult = { status: "ok", result: data };
  } else if (!error && data != null) {
    toolResult = { status: "ok", result: { row: data } };
  } else if (error) {
    toolResult = errResult("rpc_failed", { detail: error.message.slice(0, 200) });
  } else {
    toolResult = { status: "ok", result: data };
  }

  const latency = Date.now() - t0;
  const approvalState: ExecResult["approvalState"] =
    toolName === "pfos_ledger_confirm_transaction" ||
    toolName === "pfos_meal_confirm_consumption"
      ? "user_confirmed"
      : "auto";

  const resultDigest = sha256(JSON.stringify(toolResult)).slice(0, 32);

  await writeAudit(supabase, {
    tool_name: toolName,
    args: parsed.data,
    model,
    result_digest: resultDigest,
    result: toolResult,
    approval_state: approvalState,
    latency_ms: latency,
    error: Boolean(error),
    idempotency_key: idemKey,
    request_id: reqId,
  });

  // Draft/confirm envelopes also surface a UI card descriptor for the chat pane.
  let card: ExecResult["card"] | undefined;
  if (!error && data != null) {
    const row = data as {
      id: string;
      amount_in_minor_paise: number;
      occurred_on: string;
      note: string | null;
      status: string;
    };
    if (toolName === "pfos_ledger_log_expense_draft") {
      const a = parsed.data as { category: string };
      card = {
        kind: "transaction_draft",
        id: row.id,
        amount_in_minor_paise: row.amount_in_minor_paise,
        category: a.category,
        occurred_on: row.occurred_on,
        note: row.note,
        status: "estimated",
      };
    } else if (toolName === "pfos_memory_set_commitment") {
      const a = parsed.data as {
        subject: string;
        text: string;
        rule_type: string;
        numeric_limit?: number;
      };
      const r = data as { subject: string };
      card = {
        kind: "memory_note",
        id: (data as { id: string }).id,
        memoryType: "commitment",
        text: a.text,
        sub: `${r.subject} · ${a.rule_type === "open_ended" ? "open" : "≤" + (a.numeric_limit ?? "?") + "/mo"}`,
      };
    } else if (toolName === "pfos_memory_set_decision") {
      const a = parsed.data as { text: string; confidence?: number };
      card = {
        kind: "memory_note",
        id: (data as { id: string }).id,
        memoryType: "decision",
        text: a.text,
        sub: a.confidence != null ? `confidence ${a.confidence}` : null,
      };
    } else if (toolName === "pfos_meal_log_consumption_draft") {
      const a = parsed.data as { meal: string; status: string };
      card = {
        kind: "meal_draft",
        id: (data as { id: string }).id,
        meal: a.meal,
        status: a.status as "consumed" | "skipped" | "cancelled",
        occurred_on: (data as { occurred_on: string }).occurred_on,
        note: (data as { note: string | null }).note,
        record_status: "estimated",
      };
    } else if (toolName === "pfos_meal_confirm_consumption") {
      const mealId = (data as { meal_type_id: string }).meal_type_id;
      const { data: mt } = await supabase
        .from("meal_types")
        .select("name")
        .eq("id", mealId)
        .maybeSingle();
      card = {
        kind: "meal_confirmed",
        id: (data as { id: string }).id,
        meal: (mt?.name as string) ?? "meal",
        status: (data as { status: string }).status as
          | "consumed"
          | "skipped"
          | "cancelled",
        occurred_on: (data as { occurred_on: string }).occurred_on,
        note: (data as { note: string | null }).note,
        record_status: "confirmed",
      };
    } else if (toolName === "pfos_ledger_confirm_transaction") {
      card = {
        kind: "transaction_confirmed",
        id: row.id,
        amount_in_minor_paise: row.amount_in_minor_paise,
        category: null,
        occurred_on: row.occurred_on,
        note: row.note,
        status: "confirmed",
      };
    }
  }

  return {
    toolResult,
    approvalState,
    error: Boolean(error),
    card,
  };
}
