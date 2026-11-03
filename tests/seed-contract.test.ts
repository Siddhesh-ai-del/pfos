// Slice 1 acceptance tests (plan §3 Slice 1): seed idempotency + exact §2.3 rail numbers.
// Requires the local supabase stack + .env.local (SUPABASE_URL, SUPABASE_SERVICE_KEY).
import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const KEY =
  process.env.SUPABASE_SERVICE_KEY ??
  "placeholder-supabase-local-service-key"; // real key comes from `supabase status`

let supabase: SupabaseClient;

// Module-level preflight: probe the supabase stack once; skip suite if unreachable.
let dbUp = false;
try {
  const probe = createClient(URL, KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await probe.rpc("get_budget_status");
  // true Postgres errors (relation missing etc.) mean DB reachable; only
  // network-style failures flip the skip flag
  dbUp = !error || !/fetch|ECONNREFUSED|network/i.test(error.message);
} catch {
  dbUp = false;
}

beforeAll(() => {
  supabase = createClient(URL, KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
});

async function count(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

type Budget = { name: string; spent: number; budget: number | null; remaining_or_over: number | null };
type Context = {
  day: string;
  budgets: Budget[];
  recent_txns: Array<{ amount_in_minor_paise: number; category: string }>;
  tiffin_snapshot: {
    has_subscription: boolean;
    prepaid_meals?: number;
    consumed?: number;
    skipped?: number;
    cancelled?: number;
    billed_plan?: number;
    prepaid_balance?: number;
    payable_now?: number;
  };
};

describe.skipIf(!dbUp)("seed_demo_data", () => {
  it("is idempotent — second run rewrites nothing", async () => {
    const first = await supabase.rpc("reset_demo_data");
    expect(first.error).toBeNull();

    const countsBefore = {
      txns: await count("transactions"),
      meals: await count("meal_consumption"),
      decisions: await count("decisions"),
      budgets: await count("category_budgets"),
      mealTypes: await count("meal_types"),
    };

    const second = await supabase.rpc("seed_demo_data");
    expect(second.error).toBeNull();
    expect((second.data as { status: string }).status).toBe("already_seeded");

    const countsAfter = {
      txns: await count("transactions"),
      meals: await count("meal_consumption"),
      decisions: await count("decisions"),
      budgets: await count("category_budgets"),
      mealTypes: await count("meal_types"),
    };
    expect(countsAfter).toEqual(countsBefore);
  });
});

describe.skipIf(!dbUp)("§2.3 pre-demo rail contract (get_financial_context)", () => {
  let context: Context;

  beforeAll(async () => {
    const reset = await supabase.rpc("reset_demo_data");
    expect(reset.error).toBeNull();
    const ctx = await supabase.rpc("get_financial_context");
    expect(ctx.error).toBeNull();
    context = ctx.data as Context;
  });

  it("budgets match the seed arithmetic exactly", () => {
    const byName = Object.fromEntries(context.budgets.map((b) => [b.name, b]));
    // Food: S6+S7 = 124000+11000 = 135000 spent (S8 is transport) / 400000 → 265000 remaining
    expect(byName.food.spent).toBe(135000);
    expect(byName.food.budget).toBe(400000);
    expect(byName.food.remaining_or_over).toBe(265000);
    // Transport: 95 / 1500 → 1405 remaining
    expect(byName.transport.spent).toBe(9500);
    expect(byName.transport.remaining_or_over).toBe(140500);
    // Discretionary: 0 / 500 → 500 remaining
    expect(byName.discretionary.spent).toBe(0);
    expect(byName.discretionary.remaining_or_over).toBe(50000);
  });

  it("tiffin snapshot matches the seed counts + payable invariant", () => {
    const t = context.tiffin_snapshot;
    expect(t.has_subscription).toBe(true);
    expect(t.prepaid_meals).toBe(45);
    // pre-demo aggregate: 4 consumed · 1 skipped · 0 cancelled · billed ₹400 · balance ₹4,100 · payable ₹0
    expect(t.consumed).toBe(4);
    expect(t.skipped).toBe(1);
    expect(t.cancelled).toBe(0);
    expect(t.billed_plan).toBe(40000);
    expect(t.prepaid_balance).toBe(410000);
    expect(t.payable_now).toBe(0);
  });

  it("seeded decision is present and linked to the tiffin prepay transaction", () => {
    // context exposes decisions via RPC; verify via direct table read
    return supabase
      .from("decisions")
      .select("text, linked_transaction_id")
      .eq("text", "Continuing tiffin subscription next month")
      .maybeSingle()
      .then(({ data, error }) => {
        expect(error).toBeNull();
        expect(data?.linked_transaction_id).not.toBeNull();
      });
  });
});
