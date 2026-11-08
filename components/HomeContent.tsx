import { getSupabase } from "@/lib/supabase-server";
import { InboxShell } from "@/components/inbox-shell";
import dayjs from "dayjs";

// Async server component — all Postgres data access lives here, inside a
// <Suspense> boundary in page.tsx (Cache Components compliance).

export default async function HomeContent() {
  let context: FinContext | null = null;
  let loadError: string | null = null;

  try {
    context = await getFinContext();
  } catch (e) {
    console.error("get_financial_context failed", e);
    loadError = "The ledger is unreachable right now.";
  }

  if (loadError || !context) {
    return (
      <div className="flex min-h-dvh flex-col bg-paper text-ink">
        <header className="border-b border-rule px-4 py-4 md:px-6">
          <div className="mx-auto flex max-w-7xl items-center gap-2">
            <span className="label-tech text-copper">PFOS</span>
            <span className="font-display text-[22px] tracking-tight">Ledger</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 md:px-6">
          <div className="surface-instrument p-6">
            <p className="label-tech text-over">Ledger unavailable</p>
            <p className="mt-2 text-[15px] text-ink">
              I couldn&apos;t reach the ledger. Try again in a moment.
            </p>
            {loadError && (
              <p className="mt-1 font-mono text-[12px] text-ink-2">{loadError}</p>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <InboxShell
      context={context}
      monthLabel={dayjs(context.day).format("MMMM YYYY")}
    />
  );
}

type Txn = {
  id: string;
  occurred_on: string;
  kind: string;
  category: string;
  amount_in_minor_paise: number;
  note: string | null;
  status: string;
};

type Commitment = {
  id: string;
  subject: string;
  text: string;
  rule_type: string;
  numeric_limit: number | null;
  start_on: string;
  status: string;
};

type Decision = {
  id: string;
  text: string;
  decided_on: string;
  confidence: number;
  linked_transaction_id: string | null;
};

type Budget = {
  name: string;
  is_discretionary: boolean;
  spent: number;
  budget: number;
  remaining_or_over: number;
};

export type FinContext = {
  day: string;
  budgets: Budget[];
  recent_txns: Txn[];
  open_estimated_count: number;
  open_commitments: Commitment[];
  recent_decisions: Decision[];
  tiffin_snapshot: TiffinSnapshot;
};

export type TiffinSnapshot =
  | { has_subscription: false }
  | {
      has_subscription: true;
      cycle_month: string;
      prepaid_meals: number;
      price_in_minor_paise: number;
      prepaid_amount_in_minor_paise: number;
      paid_on: string;
      prepaid_balance: number;
      payable_now: number;
      remaining_prepaid: number;
      consumed: number;
      consumed_custom: number;
      skipped: number;
      cancelled: number;
      billed_plan: number;
      custom_billed: number;
      estimated_count: number;
    };

async function getFinContext(): Promise<FinContext> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_financial_context");
  if (error) throw new Error(error.message);
  return data as FinContext;
}
