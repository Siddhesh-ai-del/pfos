import dayjs from "dayjs";
import { BarChart3, Fingerprint } from "lucide-react";
import { formatINR } from "@/lib/demo";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type ByCategory = { category: string; total: number };
type BudgetRow = { name: string; remaining_or_over: number | null };

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
      <p className="mt-3 text-[13px] text-ink-2">
        Nothing recorded — this period is empty.
      </p>
    );
  }
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <ul className="mt-3 space-y-2">
      {rows.map((r, idx) => (
        <li key={r.category} className="grid grid-cols-[auto_5rem_1fr_auto] items-center gap-2">
          <span className="font-mono text-[10px] text-ink-2">
            {String(idx + 1).padStart(2, "0")}
          </span>
          <span className="truncate text-[13px] capitalize text-ink">
            {r.category}
          </span>
          <div
            className="h-1.5 rounded-full bg-rule/80"
            role="presentation"
            aria-hidden="true"
          >
            <div
              className="h-1.5 rounded-full bg-ink/75"
              style={{ width: `${Math.max(2, Math.round((r.total / max) * 100))}%` }}
            />
          </div>
          <span className="num font-mono text-[12px] text-ink">
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
      className="mt-3 w-full rounded-[var(--radius-card)] border border-rule bg-card p-4"
      aria-label={`Daily report for ${dayLabel}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 text-copper" aria-hidden="true" />
          <Badge variant="outline">Report 04-A</Badge>
          <span className="label-tech">Daily</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="num font-mono text-[11px] text-ink-2">{dayLabel}</span>
          <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Report details"><Fingerprint className="h-3.5 w-3.5" /></Button></PopoverTrigger><PopoverContent align="end" className="w-64"><p className="label-tech mb-1 text-copper-fg">Report source</p><p className="text-[12px] text-ink-2">Deterministic values rendered from RPC report payload.</p><p className="mt-1 font-mono text-[11px] text-ink">{r.day}</p></PopoverContent></Popover>
        </div>
      </div>
      <p className="num mt-3 font-display text-[34px] leading-none tracking-tight text-ink">
        {formatINR(r.expenses_total)}
      </p>
      <p className="label-tech mt-1">spent</p>
      <CategoryRows rows={r.by_category} />
      <Separator className="my-3" />
      <dl className="grid gap-1 text-[12px]">
        <div className="flex justify-between gap-3">
          <dt className="label-tech">Tiffin</dt>
          <dd className="num font-mono text-ink-2">
            B {r.tiffin.breakfast} · L {r.tiffin.lunch} · D {r.tiffin.dinner}
          </dd>
        </div>
        {r.tiffin.billed_to_date > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="label-tech">Billed today</dt>
            <dd className="num font-mono text-ink">
              {formatINR(r.tiffin.billed_to_date)}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

export function ReportCardMonthly({ card }: { card: ReportCardVM }) {
  if (card.kind !== "report_monthly") return null;
  const r = card.report;
  const monthLabel = dayjs(r.month).format("MMMM YYYY");
  return (
    <section
      className="mt-3 w-full rounded-[var(--radius-card)] border border-rule bg-card p-4"
      aria-label={`Monthly statement for ${monthLabel}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 text-copper-fg" aria-hidden="true" />
          <Badge variant="outline">Report 04-B</Badge>
          <span className="label-tech">Monthly</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="num font-mono text-[11px] text-ink-2">{monthLabel}</span>
          <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Report details"><Fingerprint className="h-3.5 w-3.5" /></Button></PopoverTrigger><PopoverContent align="end" className="w-64"><p className="label-tech mb-1 text-copper-fg">Report source</p><p className="text-[12px] text-ink-2">Deterministic values rendered from RPC report payload.</p><p className="mt-1 font-mono text-[11px] text-ink">{r.month}</p></PopoverContent></Popover>
        </div>
      </div>
      <p className="num mt-3 font-display text-[34px] leading-none tracking-tight text-ink">
        {formatINR(r.expenses)}
      </p>
      <p className="label-tech mt-1">spent so far</p>
      <CategoryRows rows={r.by_category} />

      {(r.prev_month || r.budget_violations.length > 0 || r.recurring_candidates.length > 0) && (
        <Separator className="my-3" />
      )}

      {r.prev_month && (
        <p className="num flex justify-between gap-3 font-mono text-[12px] text-ink-2">
          <span className="label-tech">Previous month</span>
          <span>{formatINR(r.prev_month.expenses)}</span>
        </p>
      )}
      {r.budget_violations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {r.budget_violations.map((v) => (
            <Badge key={v.category} variant="over" className="normal-case tracking-normal">
              {v.category} over by {formatINR(v.over_by)}
            </Badge>
          ))}
        </div>
      )}
      {r.recurring_candidates.length > 0 && (
        <p className="num mt-2 text-[11px] text-ink-2">
          <span className="label-tech mr-2">Recurring</span>
          {r.recurring_candidates.map((c) => c.label).join(", ")} — seen both months
        </p>
      )}
    </section>
  );
}
