// JSON-Schema mirrors of lib/agent/tools.ts zod schemas — the surface the
// LLM sees via function-calling. Canonical zod remains authoritative (§5.2);
// these are the *description* layer. Keep in sync; tool-schemas.test.ts
// guards the names.
import { TOOL_NAMES, type ToolName } from "./tools";

export type ToolDef = {
  name: ToolName;
  description: string;
  schema: Record<string, unknown>;
};

const DATE = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" } as const;

export const TOOL_DEFS: Record<ToolName, ToolDef> = {
  pfos_ledger_log_expense_draft: {
    name: "pfos_ledger_log_expense_draft",
    description:
      "Create an ESTIMATED expense transaction (never confirmed, never total-computed). The user must confirm in the UI.",
    schema: {
      type: "object",
      properties: {
        amount_in_minor_paise: {
          type: "integer",
          description: "₹ × 100. e.g. ₹120 → 12000. Never invented; ask if unknown.",
        },
        category: {
          type: "string",
          enum: ["food", "transport", "discretionary", "tiffin", "bills"],
        },
        kind: { type: "string", enum: ["expense", "income"], default: "expense" },
        occurred_on: DATE,
        note: { type: "string", maxLength: 120 },
        intent_acknowledged: {
          type: "boolean",
          description:
            "Set true ONLY when the user already affirmed a planned discretionary purchase this turn.",
        },
      },
      required: ["amount_in_minor_paise", "category", "occurred_on"],
    },
  },
  pfos_ledger_confirm_transaction: {
    name: "pfos_ledger_confirm_transaction",
    description:
      "Confirm an estimated transaction (user has clicked Confirm / said confirm).",
    schema: {
      type: "object",
      properties: { transaction_id: { type: "string", format: "uuid" } },
      required: ["transaction_id"],
    },
  },
  pfos_ledger_get_financial_context: {
    name: "pfos_ledger_get_financial_context",
    description:
      "Read current budgets (per-category remaining/over), recent transactions, open commitments, recent decisions, tiffin snapshot. Use when unsure.",
    schema: { type: "object", properties: {} },
  },
  pfos_ledger_get_report: {
    name: "pfos_ledger_get_report",
    description: "Deterministic daily or monthly report; all numbers RPC-derived.",
    schema: {
      type: "object",
      properties: {
        period: { type: "string", pattern: "^\\d{4}-\\d{2}(-\\d{2})?$" },
        type: { type: "string", enum: ["daily", "monthly"] },
      },
      required: ["period", "type"],
    },
  },
  pfos_meal_log_consumption_draft: {
    name: "pfos_meal_log_consumption_draft",
    description:
      "Record an ESTIMATED tiffin consumption status (consumed/skipped/cancelled). Always ask what happened; never assume.",
    schema: {
      type: "object",
      properties: {
        occurred_on: DATE,
        meal: {
          type: "string",
          description: "meal name: breakfast, lunch, dinner, late_night_snack",
        },
        status: { type: "string", enum: ["consumed", "skipped", "cancelled"] },
        note: { type: "string", maxLength: 120 },
      },
      required: ["occurred_on", "meal", "status"],
    },
  },
  pfos_meal_confirm_consumption: {
    name: "pfos_meal_confirm_consumption",
    description: "Confirm an estimated consumption record.",
    schema: {
      type: "object",
      properties: { meal_id: { type: "string", format: "uuid" } },
      required: ["meal_id"],
    },
  },
  pfos_memory_set_commitment: {
    name: "pfos_memory_set_commitment",
    description:
      "Record a forward commitment (e.g. cap Swiggy at 8 orders/month). Not a money mutation.",
    schema: {
      type: "object",
      properties: {
        subject: { type: "string", maxLength: 40 },
        text: { type: "string", maxLength: 120 },
        rule_type: {
          type: "string",
          enum: ["monthly_count", "monthly_cap", "open_ended"],
          default: "monthly_count",
        },
        numeric_limit: { type: "integer", minimum: 1 },
      },
      required: ["subject", "text"],
    },
  },
  pfos_memory_set_decision: {
    name: "pfos_memory_set_decision",
    description:
      "Record a decision about a specific purchase (e.g. planned vs impulse) with the ledger transaction link.",
    schema: {
      type: "object",
      properties: {
        text: { type: "string", maxLength: 200 },
        linked_transaction_id: { type: "string", format: "uuid" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
      required: ["text"],
    },
  },
};

export const RELEASED_TOOLS = new Set<ToolName>([
  // Slice 2: read-only context only. Later slices add tools here, never rearchitect.
  "pfos_ledger_get_financial_context",
]);

export const RELEASED_TOOL_DEFS: ToolDef[] = TOOL_NAMES.filter((t) =>
  RELEASED_TOOLS.has(t)
).map((t) => TOOL_DEFS[t]);
