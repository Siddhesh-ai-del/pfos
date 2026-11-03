import { z } from "zod";

// ============================================================
// PFOS Agent tool whitelist — plan §5.2 / §5.3. Canonical, hard-coded.
// The executor (Slice 2) parses every tool call against this map BEFORE
// any RPC. Unknown tool → tool_error; never a silent fallback.
// ============================================================

const DATE_STRING = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

const MEMORY_IDEMPOTENCY = z.string().uuid();

const logExpenseDraft = z.object({
  amount_in_minor_paise: z.number().int().min(1),
  category: z.enum(["food", "transport", "discretionary", "tiffin", "bills"]),
  kind: z.enum(["expense", "income"]).default("expense"),
  occurred_on: DATE_STRING,
  note: z.string().max(120).optional(),
  source: z.enum(["chat"]).default("chat"),
  intent_acknowledged: z.boolean().optional(), // executor-side gate bypass flag (§2.5 rule 4)
  idempotency_key: MEMORY_IDEMPOTENCY.optional(), // executor assigns if absent
});

const confirmTransaction = z.object({
  transaction_id: z.string().uuid(),
  idempotency_key: MEMORY_IDEMPOTENCY.optional(),
});

const getFinancialContext = z.object({});

const getReport = z.object({
  // 'YYYY-MM-DD' for daily, 'YYYY-MM' for monthly (executor resolves)
  period: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, "YYYY-MM or YYYY-MM-DD"),
  type: z.enum(["daily", "monthly"]),
});

const logMealConsumptionDraft = z.object({
  occurred_on: DATE_STRING,
  meal: z.string().min(2).max(40), // executor validates against seeded meal_types
  status: z.enum(["consumed", "skipped", "cancelled"]),
  note: z.string().max(120).optional(),
  idempotency_key: MEMORY_IDEMPOTENCY.optional(),
});

const confirmMealConsumption = z.object({
  meal_id: z.string().uuid(),
  idempotency_key: MEMORY_IDEMPOTENCY.optional(),
});

const setCommitment = z.object({
  subject: z.string().min(1).max(40),
  text: z.string().min(3).max(120),
  rule_type: z.enum(["monthly_count", "monthly_cap", "open_ended"]).default("monthly_count"),
  numeric_limit: z.number().int().min(1).optional(),
  idempotency_key: MEMORY_IDEMPOTENCY.optional(),
});

const setDecision = z.object({
  text: z.string().min(3).max(200),
  linked_transaction_id: z.string().uuid().optional(),
  confidence: z.number().min(0).max(1).optional(),
  idempotency_key: MEMORY_IDEMPOTENCY.optional(),
});

export const TOOL_SCHEMAS = {
  pfos_ledger_log_expense_draft: logExpenseDraft,
  pfos_ledger_confirm_transaction: confirmTransaction,
  pfos_ledger_get_financial_context: getFinancialContext,
  pfos_ledger_get_report: getReport,
  pfos_meal_log_consumption_draft: logMealConsumptionDraft,
  pfos_meal_confirm_consumption: confirmMealConsumption,
  pfos_memory_set_commitment: setCommitment,
  pfos_memory_set_decision: setDecision,
} as const;

export type ToolName = keyof typeof TOOL_SCHEMAS;
export type ToolArgs<T extends ToolName> = z.infer<(typeof TOOL_SCHEMAS)[T]>;
export const TOOL_NAMES = Object.keys(TOOL_SCHEMAS) as ToolName[];
