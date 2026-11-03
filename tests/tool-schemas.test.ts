// Slice 2 acceptance (plan §3 Slice 2d): the 8-tool zod whitelist validates
// handcrafted fixtures — valid passes, invalid rejects. Pure schema test; no DB.
import { describe, expect, it } from "vitest";
import { TOOL_SCHEMAS, TOOL_NAMES, type ToolName } from "@/lib/agent/tools";

describe("tool whitelist map", () => {
  it("exposes exactly the 8 canonical tools", () => {
    expect(TOOL_NAMES).toEqual([
      "pfos_ledger_log_expense_draft",
      "pfos_ledger_confirm_transaction",
      "pfos_ledger_get_financial_context",
      "pfos_ledger_get_report",
      "pfos_meal_log_consumption_draft",
      "pfos_meal_confirm_consumption",
      "pfos_memory_set_commitment",
      "pfos_memory_set_decision",
    ]);
  });
});

describe("valid fixtures (tool → args)", () => {
  const cases = [
    {
      tool: "pfos_ledger_log_expense_draft",
      args: {
        amount_in_minor_paise: 12000,
        category: "food",
        occurred_on: "2026-11-03",
        note: "lunch",
        source: "chat",
      },
    },
    {
      tool: "pfos_meal_log_consumption_draft",
      args: { occurred_on: "2026-11-03", meal: "lunch", status: "consumed" },
    },
    {
      tool: "pfos_memory_set_commitment",
      args: {
        subject: "Swiggy",
        text: "Cap Swiggy at 8 orders a month",
        rule_type: "monthly_count",
        numeric_limit: 8,
      },
    },
    {
      tool: "pfos_ledger_get_report",
      args: { period: "2026-11", type: "monthly" },
    },
  ];

  it.each(cases.map((c, i) => [`fixture-${i}`, c] as const))(
    "%s parses cleanly",
    (_label, c) => {
      const schema = TOOL_SCHEMAS[c.tool as ToolName];
      expect(schema).toBeDefined();
      expect(() => schema.parse(c.args)).not.toThrow();
      const parsed = schema.parse(c.args) as Record<string, unknown>;
      // defaults applied
      if (c.tool === "pfos_ledger_log_expense_draft") {
        expect(parsed.kind).toBe("expense");
        expect(parsed.source).toBe("chat");
        // absent idempotency_key is fine — the executor assigns one per §5.5
        expect(parsed.idempotency_key).toBeUndefined();
      }
    }
  );
});

describe("invalid fixtures", () => {
  const cases = [
    {
      label: "unknown category enum",
      tool: "pfos_ledger_log_expense_draft",
      args: {
        amount_in_minor_paise: 100,
        category: "travel",
        occurred_on: "2026-11-03",
      },
    },
    {
      label: "negative amount",
      tool: "pfos_ledger_log_expense_draft",
      args: {
        amount_in_minor_paise: -5,
        category: "food",
        occurred_on: "2026-11-03",
      },
    },
    {
      label: "malformed date",
      tool: "pfos_ledger_log_expense_draft",
      args: { amount_in_minor_paise: 100, category: "food", occurred_on: "Nov 5" },
    },
    {
      label: "invalid meal status",
      tool: "pfos_meal_log_consumption_draft",
      args: { occurred_on: "2026-11-03", meal: "lunch", status: "maybe" },
    },
    {
      label: "bad uuid for confirm",
      tool: "pfos_ledger_confirm_transaction",
      args: { transaction_id: "not-a-uuid" },
    },
    {
      label: "report without period",
      tool: "pfos_ledger_get_report",
      args: { type: "daily" },
    },
  ];

  it.each(cases.map((c, i) => [`invalid-${i}`, c] as const))(
    "%s is rejected",
    (_label, c) => {
      const schema = TOOL_SCHEMAS[c.tool as ToolName];
      expect(schema).toBeDefined();
      expect(() => schema.parse(c.args)).toThrow();
    }
  );
});

describe("unknown tool", () => {
  it("is not in the map (executor routes it to tool_error)", () => {
    const schema =
      TOOL_SCHEMAS["pfos_ledger_create_transaction" as keyof typeof TOOL_SCHEMAS];
    expect(schema).toBeUndefined();
    expect(TOOL_NAMES).not.toContain("pfos_ledger_sed_computable");
  });
});
