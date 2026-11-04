import type { FinContext } from "@/app/page";
import { formatINR } from "@/lib/demo";
import dayjs from "dayjs";

// Context rail — one card per money surface, one decisive number per card (design §1 Q2/Q8).

function BudgetCard({
  b,
}: {
  b: FinContext["budgets"][number];
}) {
  const over = b.remaining_or_over < 0;
  const usedPct =
    b.budget > 0 ? Math.min(100, Math.round((b.spent / b.budget) * 100)) : 0;
  return (
    <section
      aria-labelledby={`budget-${b.name}`}
      className={`rounded-card p-4 ${over ? "card--confirmed border-over" : "card--confirmed"}`}
    >
      <h3
        id={`budget-${b.name}`}
        className="font-mono text-[11px] uppercase tracking-wide text-ink-2"
      >
        {b.name}
      </h3>
      <p
        className={`num mt-1 font-display text-[24px] font-semibold ${over ? "text-over" : "text-confirmed"}`}
      >
        {over ? formatINR(-b.remaining_or_over) : formatINR(b.remaining_or_over)}
        <span className="ml-1 align-[2px] text-[12px] font-medium text-ink-2">
          {over ? "over" : "left"}
        </span>
      </p>
      <div
        className="mt-2 h-1 w-full rounded-full bg-rule"
        role="presentation"
      >
        <div
          className={`h-1 rounded-full ${over ? "bg-over" : "bg-confirmed"}`}
          style={{ width: `${over ? 100 : usedPct}%` }}
        />
      </div>
      <p className="num mt-1 text-[11px] text-ink-2">
        {formatINR(b.spent)} of {formatINR(b.budget)} spent
      </p>
    </section>
  );
}

function TiffinCard({ s }: { s: FinContext["tiffin_snapshot"] }) {
  if (!s.has_subscription) {
    return (
      <section
        aria-labelledby="tiffin-card"
        className="card--confirmed rounded-card p-4"
      >
        <h3 id="tiffin-card" className="font-mono text-[11px] uppercase tracking-wide text-ink-2">
          Tiffin
        </h3>
        <p className="mt-1 text-[13px] text-ink-2">
          No subscription this month. Say{" "}
          <span className="text-ink">&quot;prepaid 45 meals @ ₹100&quot;</span>.
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby="tiffin-card" className="card--confirmed rounded-card p-4">
      <h3 id="tiffin-card" className="font-mono text-[11px] uppercase tracking-wide text-ink-2">
        Tiffin
      </h3>
      <p className="num mt-1 font-display text-[24px] font-semibold text-ink">
        {formatINR(s.payable_now)}
        <span className="ml-1 align-[2px] text-[12px] font-medium text-ink-2">payable</span>
      </p>
      <p className="num mt-2 text-[13px] text-ink">
        {s.consumed} consumed · {s.skipped} skipped · {s.cancelled} cancelled
      </p>
      <p className="num mt-1 text-[11px] text-ink-2">
        {s.prepaid_meals} prepaid @ {formatINR(s.price_in_minor_paise)} · balance{" "}
        {formatINR(s.prepaid_balance)}
      </p>
    </section>
  );
}

function MemoryCard({ context }: { context: FinContext }) {
  const decisions = context.recent_decisions;
  const commitments = context.open_commitments;
  const empty = decisions.length === 0 && commitments.length === 0;
  return (
    <section aria-labelledby="memory-card" className="card--confirmed rounded-card p-4">
      <h3 id="memory-card" className="font-mono text-[11px] uppercase tracking-wide text-ink-2">
        Memory
      </h3>
      {empty ? (
        <p className="mt-1 text-[13px] text-ink-2">
          Nothing memorized yet. Say &quot;cap Swiggy at 8 orders a month&quot;.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {decisions.map((d) => (
            <li key={d.id} className="text-[13px] leading-snug">
              <span className="font-mono text-[10px] uppercase tracking-wide text-estimate">
                decision
              </span>
              <span className="block text-ink">{d.text}</span>
              <span className="num text-[11px] text-ink-2">
                {dayjs(d.decided_on).format("MMM D")}
              </span>
            </li>
          ))}
          {commitments.map((c) => (
            <li key={c.id} className="text-[13px] leading-snug">
              <span className="font-mono text-[10px] uppercase tracking-wide text-confirmed">
                commitment · open
              </span>
              <span className="block text-ink">{c.text}</span>
              <span className="num text-[11px] text-ink-2">
                from {dayjs(c.start_on).format("MMM D")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MonthGlanceCard({ context }: { context: FinContext }) {
  const monthExpense = context.budgets.reduce((acc, b) => acc + b.spent, 0);
  const today = dayjs(context.day);
  return (
    <section aria-labelledby="glance-card" className="card--confirmed rounded-card p-4">
      <h3 id="glance-card" className="font-mono text-[11px] uppercase tracking-wide text-ink-2">
        {today.format("MMMM YYYY")}
      </h3>
      <p className="num mt-1 font-display text-[24px] font-semibold text-ink">
        {formatINR(monthExpense)}
        <span className="ml-1 align-[2px] text-[12px] font-medium text-ink-2">
          spent this month
        </span>
      </p>
      {context.open_estimated_count > 0 && (
        <p className="num mt-2 text-[12px] text-estimate">
          {context.open_estimated_count} estimate
          {context.open_estimated_count > 1 ? "s" : ""} awaiting confirmation
        </p>
      )}
    </section>
  );
}

export function ContextRail({ context }: { context: FinContext }) {
  const budgets = context.budgets.filter((b) => b.budget != null);
  return (
    <aside className="flex flex-col gap-4" aria-label="Financial context">
      {/* snap-scroll card strip on mobile (design §4.3): rail above chat */}
      <div className="grid grid-cols-1 gap-4">
        {budgets.map((b) => (
          <BudgetCard key={b.name} b={b} />
        ))}
        <TiffinCard s={context.tiffin_snapshot} />
        <MonthGlanceCard context={context} />
        <MemoryCard context={context} />
      </div>
    </aside>
  );
}
