import { getSupabase } from "@/lib/supabase-server";
import { ContextRail } from "@/components/ContextRail";
import { ChatPane } from "@/components/ChatPane";
import { TopBar } from "@/components/TopBar";
import dayjs from "dayjs";

// PFOS app shell (Slice 1): TopBar + context rail (RPC-fed) + chat placeholder.
// The rail reads get_financial_context — same RPC surface the LLM tools read.

export default async function Home() {
  let context: Awaited<ReturnType<typeof getFinContext>> | null = null;
  let loadError: string | null = null;

  try {
    context = await getFinContext();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Unknown error";
  }

  const monthLabel = context?.day
    ? dayjs(context.day).format("MMMM YYYY")
    : dayjs().format("MMMM YYYY");

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <TopBar monthLabel={monthLabel} />
      {loadError ? (
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:px-8">
          <div className="card--confirmed rounded-card p-6">
            <p className="font-mono text-sm uppercase tracking-wide text-ink-2">
              Ledger unavailable
            </p>
            <p className="mt-2 text-[15px] text-ink">
              I couldn&apos;t reach the ledger. Try again in a moment.
            </p>
            <p className="mt-1 text-[13px] text-ink-2">{loadError}</p>
          </div>
        </main>
      ) : context ? (
        <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-6 px-4 pb-8 pt-6 md:grid-cols-5 md:px-8">
          <div className="md:col-span-3">
            <ChatPane />
          </div>
          <div className="md:col-span-2">
            <ContextRail context={context} />
          </div>
        </main>
      ) : null}
    </div>
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

type TiffinSnapshot =
  | { has_subscription: false }
  | {
      has_subscription: true;
      cycle_month: string;
      prepaid_meals: number;
      price: number;
      prepaid_amount_in_minor_paise: number;
      price_in_minor_paise: number;
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
