"use client";

import * as React from "react";
import dayjs from "dayjs";
import { motion, useReducedMotion } from "motion/react";
import type { FinContext } from "@/components/HomeContent";
import { formatINR } from "@/lib/demo";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function InstrumentLabel({ n, title }: { n: string; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="label-tech text-copper">{n}</span>
      <h3 className="label-tech text-ink">{title}</h3>
    </div>
  );
}

function BudgetInstrument({ b }: { b: FinContext["budgets"][number] }) {
  const over = b.remaining_or_over < 0;
  const usedPct =
    b.budget > 0 ? Math.min(100, Math.round((b.spent / b.budget) * 100)) : 0;
  return (
    <section
      aria-labelledby={`budget-${b.name}`}
      className="surface-instrument p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4
            id={`budget-${b.name}`}
            className="font-mono text-[11px] uppercase tracking-wide text-ink"
          >
            {b.name}
          </h4>
          {b.is_discretionary && (
            <span className="label-tech mt-0.5 block">discretionary</span>
          )}
        </div>
        <Badge variant={over ? "over" : "confirmed"}>
          {over ? "over" : "within"}
        </Badge>
      </div>
      <p
        className={`num mt-2 font-display text-[28px] leading-none ${over ? "text-over" : "text-confirmed"}`}
      >
        {formatINR(over ? -b.remaining_or_over : b.remaining_or_over)}
        <span className="ml-1.5 align-[3px] font-mono text-[10px] uppercase tracking-wide text-ink-2">
          {over ? "over" : "left"}
        </span>
      </p>
      <div className="mt-3">
        <Progress
          value={over ? 100 : usedPct}
          indicatorClassName={over ? "bg-over" : "bg-confirmed"}
          aria-label={`${b.name} budget used`}
        />
      </div>
      <p className="num mt-2 text-[12px] text-ink-2">
        {formatINR(b.spent)} of {formatINR(b.budget)} spent
      </p>
    </section>
  );
}

function TiffinInstrument({ s }: { s: FinContext["tiffin_snapshot"] }) {
  if (!s.has_subscription) {
    return (
      <section className="surface-instrument p-3" aria-labelledby="tiffin-inst">
        <InstrumentLabel n="02" title="Tiffin cycle" />
        <p id="tiffin-inst" className="text-[13px] text-ink-2">
          No subscription this month. Say{" "}
          <span className="font-mono text-[12px] text-ink">
            &quot;prepaid 45 meals @ ₹100&quot;
          </span>
          .
        </p>
      </section>
    );
  }
  return (
    <section className="surface-instrument p-3" aria-labelledby="tiffin-inst">
      <InstrumentLabel n="02" title="Tiffin cycle" />
      <div className="flex items-end justify-between gap-3">
        <div>
          <p id="tiffin-inst" className="num font-display text-[28px] leading-none text-ink">
            {formatINR(s.payable_now)}
          </p>
          <p className="label-tech mt-1">payable now</p>
        </div>
        <Badge variant={s.payable_now > 0 ? "over" : "confirmed"}>
          {dayjs(s.cycle_month).format("MMM YYYY")}
        </Badge>
      </div>
      <Separator className="my-3" />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
        <div>
          <dt className="label-tech">Consumed</dt>
          <dd className="num mt-0.5 text-ink">{s.consumed}</dd>
        </div>
        <div>
          <dt className="label-tech">Skipped</dt>
          <dd className="num mt-0.5 text-ink">{s.skipped}</dd>
        </div>
        <div>
          <dt className="label-tech">Cancelled</dt>
          <dd className="num mt-0.5 text-ink">{s.cancelled}</dd>
        </div>
        <div>
          <dt className="label-tech">Balance</dt>
          <dd className="num mt-0.5 text-ink">{formatINR(s.prepaid_balance)}</dd>
        </div>
      </dl>
      <p className="num mt-3 border-t border-rule pt-2 text-[11px] text-ink-2">
        {s.prepaid_meals} prepaid @ {formatINR(s.price_in_minor_paise)} · billed{" "}
        {formatINR(s.billed_plan)}
      </p>
    </section>
  );
}

function MemoryInstrument({ context }: { context: FinContext }) {
  const decisions = context.recent_decisions;
  const commitments = context.open_commitments;
  const empty = decisions.length === 0 && commitments.length === 0;
  return (
    <section className="surface-instrument p-3" aria-labelledby="memory-inst">
      <InstrumentLabel n="03" title="Memory" />
      {empty ? (
        <p id="memory-inst" className="text-[13px] text-ink-2">
          Nothing memorized yet. Try{" "}
          <span className="font-mono text-[12px] text-ink">
            &quot;cap Swiggy at 8 orders a month&quot;
          </span>
          .
        </p>
      ) : (
        <ul id="memory-inst" className="space-y-3">
          {decisions.map((d) => (
            <li key={d.id} className="border-l-2 border-estimate/50 pl-2.5">
              <span className="label-tech text-estimate">Decision</span>
              <p className="mt-0.5 text-[13px] leading-snug text-ink">{d.text}</p>
              <p className="num mt-1 text-[11px] text-ink-2">
                {dayjs(d.decided_on).format("MMM D, YYYY")}
              </p>
            </li>
          ))}
          {commitments.map((c) => (
            <li key={c.id} className="border-l-2 border-confirmed/50 pl-2.5">
              <span className="label-tech text-confirmed">Commitment · open</span>
              <p className="mt-0.5 text-[13px] leading-snug text-ink">{c.text}</p>
              <p className="num mt-1 text-[11px] text-ink-2">
                from {dayjs(c.start_on).format("MMM D, YYYY")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GlanceInstrument({ context }: { context: FinContext }) {
  const monthExpense = context.budgets.reduce((acc, b) => acc + b.spent, 0);
  const today = dayjs(context.day);
  return (
    <section className="surface-instrument p-3" aria-labelledby="glance-inst">
      <InstrumentLabel n="00" title="Month glance" />
      <p id="glance-inst" className="label-tech">{today.format("MMMM YYYY")}</p>
      <p className="num mt-1 font-display text-[28px] leading-none text-ink">
        {formatINR(monthExpense)}
      </p>
      <p className="label-tech mt-1">spent this month</p>
      {context.open_estimated_count > 0 && (
        <p className="num mt-3 border-t border-rule pt-2 text-[12px] text-estimate">
          {context.open_estimated_count} estimate
          {context.open_estimated_count > 1 ? "s" : ""} awaiting confirmation
        </p>
      )}
    </section>
  );
}

export function ContextInstruments({ context }: { context: FinContext }) {
  const budgets = context.budgets.filter((b) => b.budget != null);
  const reduce = useReducedMotion();
  const wrap = (children: React.ReactNode, i: number) =>
    reduce ? (
      <div>{children}</div>
    ) : (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: i * 0.03, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {children}
      </motion.div>
    );

  return (
    <div className="space-y-4">
      {wrap(<GlanceInstrument context={context} />, 0)}
      <Tabs defaultValue="budgets" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="tiffin">Tiffin</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
        </TabsList>
        <TabsContent value="budgets" className="space-y-3">
          <InstrumentLabel n="01" title="Budget instruments" />
          {budgets.map((b) => (
            <BudgetInstrument key={b.name} b={b} />
          ))}
        </TabsContent>
        <TabsContent value="tiffin">
          <TiffinInstrument s={context.tiffin_snapshot} />
        </TabsContent>
        <TabsContent value="memory">
          <MemoryInstrument context={context} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
