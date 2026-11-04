// ReportCards (design-direction §1 Q7): reports are deterministic editorial
// spreads. Every number on these cards is rendered from RPC tokens passed in
// `report`; the LLM never touches them (LLM produces optional prose only).

import dayjs from "dayjs";
import { formatINR } from "@/lib/demo";

type ByCategory = { category: string; total: number };
type BudgetRow = {
  name: string;
  remaining_or_over: number | null;
};

type DailyReport = {
  day: string;
  expenses_total: number;
  income_total: number;
  by_category: ByCategory[];
  budget_status: BudgetRow[];
  tiffin: {
    breakfast: string;
    lunch: string;
    dinner: string;
    billed_to_date: number;
  };
};

type MonthlyReport = {
  month: string;
  expenses: number;
  income: number;
  by_category: ByCategory[];
  prev_month: { expenses: number } | null;
  budget_violations: Array<{ category: string; over_by: number }>;
  recurring_candidates: Array<{ label: string; months: number }>;
};

export type ReportCardVM =
  | { kind: "report_daily"; period: string; report: DailyReport }
  | { kind: "report_monthly"; period: string; report: MonthlyReport };

function CategoryRows({ rows }: { rows: ByCategory[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-2 text-[13px] text-ink-2">
        Nothing recorded — this period is empty.
      </p>
    );
  }
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <ul className="mt-2 divide-y divide-rule">
      {rows.map((r) => (
        <li key={r.category} className="flex items-center gap-3 py-1.5">
          <span className="w-24 shrink-0 text-[13px] capitalize text-ink">
            {r.category}
          </span>
          <div
            className="h-2 rounded-full bg-rule"
            role="presentation"
            style={{ width: "100%" }}
          >
            <div
              className="h-2 rounded-full bg-ink"
              style={{ width: `${Math.round((r.total / max) * 100)}%` }}
            />
          </div>
          <span className="num ml-auto shrink-0 text-[13px] text-ink">
            {formatINR(r.total)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ReportCardDaily({ card }: { card: ReportCardVM }) {
  if (card.kind !== "report_daily") return null;
  const r = card.report;
  const dayLabel = dayjs(r.day).format("MMM D, YYYY");
  return (
    <section
      className="card--confirmed mt-2 w-full rounded-card p-3"
      aria-label={`Daily report for ${dayLabel}`}
    >
      <h4 className="font-mono text-[10px] uppercase tracking-widest text-ink-2">
        Daily report · {dayLabel}
      </h4>
      <p className="num mt-1 font-display text-[28px] font-semibold leading-none text-ink">
        {formatINR(r.expenses_total)}
        <span className="ml-2 align-[3px] text-[12px] font-medium text-ink-2">spent</span>
      </p>
      <CategoryRows rows={r.by_category} />
      <p className="num mt-2 border-t border-rule pt-2 text-[12px] text-ink-2">
        Tiffin — breakfast {r.tiffin.breakfast}, lunch {r.tiffin.lunch}, dinner{" "}
        {r.tiffin.dinner}.
        {r.tiffin.billed_to_date > 0 &&
          ` Billed today: ${formatINR(r.tiffin.billed_to_date)}.`}
      </p>
    </section>
  );
}

export function ReportCardMonthly({ card }: { card: ReportCardVM }) {
  if (card.kind !== "report_monthly") return null;
  const r = card.report;
  const monthLabel = dayjs(r.month).format("MMMM YYYY");
  return (
    <section
      className="card--confirmed mt-2 w-full rounded-card p-4"
      aria-label={`Monthly statement for ${monthLabel}`}
    >
      <h4 className="font-mono text-[10px] uppercase tracking-widest text-ink-2">
        Monthly statement · {monthLabel}
      </h4>
      <p className="num mt-1 font-display text-[28px] font-semibold leading-none text-ink">
        {formatINR(r.expenses)}
        <span className="ml-2 align-[3px] text-[12px] font-medium text-ink-2">
          spent so far
        </span>
      </p>
      <CategoryRows rows={r.by_category} />

      {r.prev_month && (
        <p className="num mt-2 border-t border-rule pt-2 text-[12px] text-ink-2">
          October: {formatINR(r.prev_month.expenses)}
        </p>
      )}
      {r.budget_violations.length > 0 && (
        <p className="num mt-1 text-[12px] text-over">
          {r.budget_violations
            .map((v) => `${v.category} over by ${formatINR(v.over_by)}`)
            .join(" · ")}
        </p>
      )}
      {r.recurring_candidates.length > 0 && (
        <p className="num mt-1 text-[11px] uppercase tracking-wide text-ink-2">
          recurring: {r.recurring_candidates.map((c) => c.label).join(", ")} — seen
          both months
        </p>
      )}
    </section>
  );
}
