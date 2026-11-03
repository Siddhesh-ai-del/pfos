# PFOS — MVP Implementation Plan (Phase 3 deliverable)

**Project:** Personal Financial Operating System · **Author:** planner subagent · **Date:** 2026-11-03
**Status:** DRAFT — pending user review (see §10 Checkpoint Verdict)
**Upstream:** `docs/research-brief.md` (research, PASS WITH NOTES) · `HACKATHON.md` (decisions log, wedge = F — memory-first capture)
**Doc rule:** this file is directly buildable-from. Schema/route/tool names below are canonical — do not invent synonyms. All money math lives in Postgres RPCs; the LLM never produces a number shown to the user, ever.

---

## Table of contents

1. Requirements restatement (§1)
2. Golden demo flow (§2) — write-first rule honored
3. MVP slice list (§3)
4. Schema (§4) — tables, RLS, RPC signatures
5. API / agent design (§5) — tool whitelist, executor, pseudocode
6. Stack decisions + versions (§6)
7. Dependencies + risks (§7)
8. Cut list (§8)
9. Estimated complexity (§9)
10. Checkpoint verdict (§10)

---

# §1 Requirements restatement

Non-negotiable, carried from `HACKATHON.md` + research brief. Full concept (9-section doc structure, competitor evidence, tensions) lives in `docs/research-brief.md`; not restated here.

| # | Requirement | Source |
|---|---|---|
| R1 | NL capture: one-sentence expense entry ("spent ₹120 on lunch") → **estimated draft → explicit user confirm** → budget context updates live. | Wedge slice ① |
| R2 | Overflow dialogue: if a capture projects past a discretionary cap (the "headphone moment"), assistant surfaces remaining/overflow numbers from RPC and asks intent ("record as planned purchase?") **before** creating a draft. | Wedge slice ① |
| R3 | Financial memory: decisions + commitments (+ preferences) are first-class, queryable, injectable into context; reminder surface on home. | Wedge slice ② |
| R4 | Tiffin meter: meal types with per-meal prices; consumption records with statuses `consumed / skipped / cancelled`; never silently assume consumption; monthly payable math in Postgres. | Wedge slice ③ |
| R5 | Reports (daily + monthly) as **narrative cards**; every number deterministic from RPC output; LLM adds one-line context only. | Wedge slice ④ |
| R6 | Yearly trends = stretch slice (cut target). | Wedge slice ⑤ |
| R7 | Honest agent: whitelisted tool calls only; server-side executor validates; audit table with idempotency keys; non-judgmental tone (CHI 2016 guilt finding). | Global constraint |
| R8 | Stack: Next.js 14+ App Router + Supabase (Postgres/Auth/RLS/RPC) + one LLM provider via tool-calling; Vercel deploy; INR (₹), India conventions. | HACKATHON.md |
| R9 | Demo-first discipline: every slice independently demoable; demo leads with headphone moment; tiffin failure-tracking + year trends are cut targets, not dependencies. | HACKATHON.md |

**Success criteria (MVP exit):**

- [ ] Golden demo (§2) runs top-to-bottom from a single "Reset demo" click with all numbers matching §2.7.
- [ ] No expense or meal record ever enters the ledger except via a user-visible `estimated → confirmed` action or seeded data.
- [ ] Every mutation of user data has an `audit_log` row with a unique `idempotency_key`.
- [ ] A judge can break (or not break) it with 5 unlisted chat phrasings and it never invents a transaction or a number.

---

# §2 Golden demo flow (write-first)

This section is the contract for the whole build. Every slice's acceptance test traces back to a beat in §2.6.

## 2.1 What the judge sees (one paragraph)

A single-page app: left = chat pane (assistant + user bubbles + **draft action cards** with Confirm buttons); right = a **context rail** that pills three things — budget cards (per category), a tiffin card, and a memory/reminders card. Top bar: project name, month label ("November 2026"), and a discreet **"Reset demo"** button. The whole demo is keyboard-driven by one person typing short sentences; every assistant number is visibly echoed by a card from the context rail, so the judge can see the LLM is not narrating from imagination — it reads from the same RPC surface the cards use. **Visual direction: "Quiet Ledger" — all styling, tokens, states, and copy voice are canonical from `docs/design-direction.md` (committed decision in HACKATHON.md). Signature trust pair: dashed "Estimated" pencil cards → stamped "Confirmed" cards; every rail card carries an "≡ audit" toggle revealing its tool call + RPC result.**

## 2.2 Demo mode / reset note

- MVP runs in **demo mode**: single fixed demo user (`DEMO_USER_ID = 00000000-0000-0000-0000-000000000001`), **no auth screens**. RLS is enabled (§4.3) but demo policies are permissive by design; real auth is a post-MVP SaaS concern (§7, §8).
- `POST /api/demo/reset` truncates all rows for the demo user and re-runs `seed_demo_data()` inside one transaction, then reloads `/`. Seeds are idempotent — running the app without a reset shows the last demo's end state.
- The reset button lives in the top bar and is also the recovery path mid-demo (if a beat misfires: reset, re-run from Beat 0).
- Demo driver = a human (or the page owner) typing from the script in §2.6. No autoplay, no scripted bot. Rule: what the judge sees typed is what the code executes.

## 2.3 Seed state (exact arithmetic)

### Categories + monthly budgets (seeded)

| Category | is_discretionary | Monthly budget | Role in demo |
|---|---|---|---|
| Food | no | ₹4,000 | main capture category (lunch) |
| Transport | no | ₹1,500 | quiet allocation proof |
| Discretionary | **yes** | ₹500 | the headphone moment |
| Tiffin | no | *no budget* | prepaid purchase recorded here (Oct) |
| Bills | no | no budget | present but idle |

Budgets are month-agnostic for MVP (one active set, §4.2). Display always shows `spent / budget → remaining or over`.

### Seed transactions (kind = expense, status = confirmed, source = seed, all for `DEMO_USER_ID`)

| # | Date | Amount | Category | Note |
|---|---|---|---|---|
| S1 | 2026-10-05 | ₹2,140 | Food | Groceries — D-Mart |
| S2 | 2026-10-12 | ₹680 | Transport | Auto + metro |
| S3 | 2026-10-18 | ₹1,260 | Food | Dinner, two people |
| S4 | 2026-10-22 | ₹1,620 | Discretionary | Flipkart impulse: desk lamp |
| S5 | 2026-10-31 | ₹4,500 | Tiffin | Tiffin prepaid: 45 meals @ ₹100 (Utsav Mess) |
| S6 | 2026-11-01 | ₹1,240 | Food | Groceries |
| S7 | 2026-11-02 | ₹110 | Food | Coffee + samosa |
| S8 | 2026-11-02 | ₹95 | Transport | Auto to campus |

**October total expense = ₹10,200** (2,140+680+1,260+1,620+4,500). **November spend before demo = ₹1,445** (1,240+110+95). Income seed: none (income type supported by schema; demo shows ₹0).

### Seed tiffin subscription + consumption

`tiffin_subscriptions` seed row: cycle month **2026-11-01**, `prepaid_meals = 45`, `price_in_minor = 10,000` (₹100), `prepaid_amount = ₹4,500`, `paid_on = 2026-10-31`. Meal types (all `prepaid` plan, ₹100 flat): `breakfast`, `lunch`, `dinner`. (One `custom` meal type, `Late night snack ₹60`, seeded but unused in the demo — proves extensibility.)

Seed meal_consumption (status `confirmed`):

| Date | Meal | Status |
|---|---|---|
| 2026-11-01 | breakfast | consumed |
| 2026-11-01 | lunch | consumed |
| 2026-11-01 | dinner | **skipped** |
| 2026-11-02 | breakfast | consumed |
| 2026-11-02 | lunch | consumed |
| 2026-11-02 | dinner | consumed |

Pre-demo tiffin aggregate: **45 prepaid · 4 consumed · 1 skipped · 0 cancelled · billed-to-date ₹400 · prepaid balance ₹4,100 · payable ₹0.**

### Seed memory

| Type | Text | Confidence |
|---|---|---|
| decision | "Continuing tiffin subscription next month" | 0.85 (date 2026-10-31, linked to S5) |

Commitments seed: none (created live, Beat 4).

### Pre-demo context rail (what Beat 0 shows)

| Card | Deterministic content |
|---|---|
| Budget — Food | spent ₹1,350 / ₹4,000 → **₹2,650 remaining** |
| Budget — Transport | spent ₹95 / ₹1,500 → **₹1,405 remaining** |
| Budget — Discretionary | spent ₹0 / ₹500 → **₹500 remaining** |
| Tiffin | 45 prepaid · 4 consumed · 1 skipped · billed-to-date ₹400 · prepaid balance ₹4,100 · payable ₹0 |
| Memory | Decision: "Continuing tiffin subscription next month" (Oct 31) |
| Month glance | November-to-date ₹1,445 · October ₹10,200 |

## 2.4 Tool-call plumbing map (one line format)

`frontend chat input → POST /api/agent → LLM (tool calls) → executor validates (zod whitelist) → Supabase RPC → estimated row → card in chat → user clicks Confirm → POST /api/confirm → confirm RPC → status confirmed → context rail refresh (GET /api/fin/context)`.

## 2.5 Rule pack shown to the LLM (system-prompt digest; full text ships in Slice 2)

1. You are PFOS, a judgment-free financial assistant for an Indian user. Never moralize; research finding: guilt about logging non-necessary spend causes abandonment (CHI 2016).
2. **You never compute or state money math.** Every number you say must come verbatim from a tool result. If a tool didn't return it, you don't say it.
3. Only whitelisted tools. One intent at a time unless the user clearly asked for two things.
4. Before creating an **expense draft whose category is discretionary and whose amount exceeds half the remaining budget** (covering the headphone case), surface the budget context and ask intent in one sentence; the executor does this by intercepting your draft call (§5.5 step 5) and returning `intent_required`. Overflow phrasing required: `<remaining ₹X> left in <Category>; that's ₹Y over. Record as a planned purchase?` If the user already affirmed a planned purchase this turn, do NOT re-ask; create the draft normally.
5. For consumption you always ask what happened; you never assume a meal was consumed, skipped, or cancelled.
6. Method: call the narrowest tool; prefer `get_financial_context` when unsure; `get_report` when the user asks for summaries. Answer in ≤ 3 short sentences + one card reference.

## 2.6 Demo driver script (exact lines, expected on-screen responses, tracing)

Format: `Beat | driver types | LLM tool call(s) | screen response | numbers shown (all RPC-derived)`

| Beat | Driver types | Tool call(s) | What the judge sees |
|---|---|---|---|
| **0 – load** | *(clicks app)* | — | Context rail per §2.3 last table. Chat greets: "Ready. Type an expense like 'spent ₹120 on lunch'." |
| **1 – capture + budget** | `spent ₹120 on lunch today` | `pfos_ledger_log_expense_draft{amount_in_minor_paise:12000, category:"food", date:"2026-11-03", note:"lunch", source:"chat"}` | Estimated card: **"Estimated · ₹120 · Food · Today (Nov 3)"** + Confirm button. Assistant (non-judgmental, one line): "Logged ₹120 lunch as an estimate. Confirm when you're ready — or add context if I got the category wrong." Confirm → `pfos_ledger_confirm_transaction{transaction_id}` → Budget card refreshes: Food **₹2,530 remaining** (was ₹2,650). |
| **2 – headphone overflow** | `bought headphones for ₹3,000` | *(executor overflow gate, §5.5 step 5 — the draft tool's args are validated, budgets fetched server-side, and the call is intercepted; no draft RPC fires)* | Inline reply: "₹500 left in Discretionary; that's ₹2,500 over. Record as a planned purchase?" **No draft is created** (audit shows `approval_state='rejected'` for the intercepted call). |
| **3 – planned purchase** | `yes, planned` | `pfos_ledger_log_expense_draft{amount_in_minor_paise:300000, category:"discretionary", date:"2026-11-03", note:"headphones", source:"chat"}` **and** `pfos_memory_set_decision{text:"Headphones ₹3,000 — planned purchase", scope:"spending", confidence:0.9}` | Two cards: Estimated **"₹3,000 · Discretionary · Today"** + Confirm; Memory card: "Decision recorded: headphones ₹3,000 — planned." User clicks Confirm → Budget card flips red: **spent ₹3,000 / ₹500 → over by ₹2,500**. |
| **4 – commitment** | `cap Swiggy at 8 orders a month` | `pfos_memory_set_commitment{subject:"Swiggy", text:"Cap Swiggy at 8 orders a month", scope:"spending", numeric_limit:8, rule_type:"monthly_count"}` | Memory card: "Commitment: Swiggy ≤ 8 orders/mo (open)". Reminder card on home rail now lists it. No confirm needed (non-money mutation), audit row with `approval_state='auto'`. |
| **5 – memory query** | `what unnecessary purchases did I make?` | `pfos_ledger_get_financial_context{}` | Assistant one-liner + card recall: "This month: headphones ₹3,000, which you marked a planned purchase on Nov 3. Last month, the ₹1,620 desk lamp stands out as the biggest discretionary item." **Numbers ₹3,000 / ₹1,620 come verbatim from tool output** (last-month figure arrives via `get_financial_context`'s recent-txs window). |
| **6 – tiffin statuses** | | `pfos_meal_log_consumption_draft{date:"2026-11-03", meal:"breakfast", status:"skipped"}` **and** `pfos_meal_log_consumption_draft{date:"2026-11-03", meal:"dinner", status:"cancelled"}` | Two estimated consumption cards: "**Skipped · Breakfast · Today**", "**Cancelled · Dinner · Today**" (no money shown — statuses are not billing events). Confirm (a single "Confirm both" button on the first card confirms both — the UI may batch, the RPCs stay per-row). |
| **7 – tiffin refill** | `had lunch at the mess today` | `pfos_meal_log_consumption_draft{date:"2026-11-03", meal:"lunch", status:"consumed"}` | Estimated card "Consumed · Lunch · Today" → Confirm → Tiffin card: **5 consumed · 2 skipped · 1 cancelled · billed-to-date ₹500 · prepaid balance ₹4,000 · payable ₹0**. |
| **8 – daily report** | `show me today's report` | `pfos_ledger_get_report{period:"2026-11-03", type:"daily"}` | Narrative card: "Expenses today: ₹3,120 (Food ₹120, Discretionary ₹3,000). Budget: Food ₹2,530 left; Discretionary over by ₹2,500; Transport ₹1,405 left. Tiffin today: lunch consumed, breakfast skipped, dinner cancelled." |
| **9 – monthly report** | `how's my month looking?` | `pfos_ledger_get_report{period:"2026-11", type:"monthly"}` | Monthly card: "Spent ₹4,565 so far (3 days). Categories: Food ₹1,470 · Discretionary ₹3,000 · Transport ₹95. vs October: 45% of ₹10,200. Recurring candidates: Groceries ×2 months, Auto ×2 months." Budget-violation line: "Discretionary over by ₹2,500." |
| **10 – reset** | *(clicks Reset demo)* | — | Seed state per §2.3 restored; rail returns to Beat 0. |

## 2.7 Full demo end-state — arithmetic ledger (self-check)

| Figure | Value | Verification |
|---|---|---|
| November total expense (final) | **₹4,565** | 1,240+110+95+120+3,000 |
| Food spent / budget / remaining | ₹1,470 / ₹4,000 / **₹2,530** | 1,240+110+120 |
| Transport spent / remaining | ₹95 / **₹1,405** | 1,500−95 |
| Discretionary spent / budget / over | ₹3,000 / ₹500 / **over by ₹2,500** | 3,000−500 |
| October total | **₹10,200** | §2.3 |
| Nov-to-date vs October | 4,565 ÷ 10,200 = **44.8%** ("45%") | — |
| Tiffin prepaid / billed-to-date / balance / payable | ₹4,500 / **₹500** / **₹4,000** / **₹0** | 5 consumed × ₹100 |
| Tiffin counts | **5 consumed · 2 skipped · 1 cancelled** | §2.3 seed + 3 demo rows |
| Daily Nov 3 expenses / categories | **₹3,120** (Food ₹120, Disc. ₹3,000) | lunch + headphones |
| Memory records | 1 decision (seed) + 1 decision (headphones, linked to txn) + 1 commitment (Swiggy ≤ 8/mo) | §2.6 |
| Audit rows | ≥ 10 tool calls logged (every LLM tool invocation), each with unique idempotency key | §4.2 |

**Reconciliation invariant:** `prepaid_amount − billed_to_date = prepaid_balance` (₹4,500 − ₹500 = ₹4,000) and `payable_now = max(0, −prepaid_balance) + custom_billed = ₹0`. If any displayed number breaks this, the demo fails and the slice regresses.

## 2.8 Planned-purchase path (Beat 2 core contract, normative)

`capture(NL) → parse (₹3,000, category candidate: discretionary) → executor gate (§5.5 step 5): discretionary AND amount > remaining ÷ 2 (₹3,000 > ₹250) → fetch budgets via get_budget_status RPC → surface remaining (₹500) + overflow (₹2,500) → ask intent in one question → NO draft row exists at this point → user affirms ("yes, planned") → gate bypassed for this turn (acknowledged-intent flag, §5.5) → draft created → user Confirms → decision memory recorded, linked to the transaction → every number shown traces verbatim to a tool result`

## 2.9 LLM gate enforcement (non-negotiable, enforced for real)

- The **executor** is the single change-agent: zod validates every tool args object against the whitelist; the whitelist is a hard map, a nonexistent tool name → a `tool_error` tool result to the LLM (never a silent fallback).
- Every money number the LLM may echo arrives inside a tool result; there is no arithmetic field anywhere the LLM can touch.
- The audit table logs every call with `args`, `model`, `result_digest`, `approval_state`.

---

# §3 MVP slice list (ordered, vertical, each independently demoable)

## Slice 1 — Foundation: scaffold + schema + seed + demo reset + skeleton app
**Goal:** a running Next.js app on Vercel with Supabase and all tables (§4), the exact §2.3 seed loaded, one "Reset demo" button that returns the app to Beat 0. The **hardware** everything else plugs into.

- Tables: all of §4 (all migrations, one-shot)
- API routes: `POST /api/demo/reset`, `GET /api/fin/context`
- UI: app shell (TopBar with month label + Reset button; Context rail wired to `/api/fin/context`, chat pane placeholder + static greeting)
- Acceptance tests: (a) `seed_demo_data()` reruns idempotent (`idempotent seed` — second seed doesn't duplicate rows); (b) `/` shows the exact §2.3 rail numbers; (c) Reset button resets them; (d) vitest: seed contract test (fixed row counts + the §2.7 pre-demo column matches).
- Risk: LOW · Complexity: S/M · Stadium-safe: YES

## Slice 2 — Agent backbone: `/api/agent` + read-only tool first
**Goal:** chat round-trips through the LLM with the whitelist mechanism **working end-to-end**, but read-only: only `pfos_ledger_get_financial_context` released. All later slices extend this map, none rearchitect it.

- Tables: `audit_log` only (writes here)
- API routes: `POST /api/agent` (weave, §5.5)
- UI: ChatPane (bubbles), tool-call cards for context reads (collapsed), model shows its work as a "Tool" chip
- Acceptance: (a) typed `what's my month looking like?` answers using context only; (b) forced non-whitelisted tool name in a smoke prompt returns `tool_error` card + audit row; (c) **vitest: schema rejection** test per tool; (d) zod test: the 8-tool map validates 10 handcrafted fixtures (4 valid, 6 invalid)
- Risk: MEDIUM (tool-calling reliability of open-weight models; §7) · Complexity: M · Stadium-safe: YES

## Slice 3 — Capture ①: `log_expense_draft` + Confirm + live budget (demo Beats 1, 2, 3)
**Goal:** the headphone moment. Dispatch order inside the slice: plain capture first, budget-refresh second, overflow dialogue third (it depends on both).

- Tables: `transactions`, `expense_categories`, `category_budgets`; plus `audit_log`
- API routes: `/api/agent` (new tools `pfos_ledger_log_expense_draft`, `pfos_ledger_confirm_transaction`, plus `get_budget_status` for the overflow check), `POST /api/confirm`
- UI: DraftExpenseCard (red-if-over), ConfirmBar, BudgetCard live refresh
- Acceptance: (a) Beat 1, 2, 3 trace exactly; (b) no draft created in Beat 2 until intent confirmed (server audit shows no `log_expense_draft` row before the "yes, planned" turn); (c) Confirm is idempotent: second click = no duplicate row; (d) `spent 120 on lunch` (missing ₹) is parsed, not guessed — the assistant asks for an amount and never invents one
- Risk: MEDIUM (LLM draft fidelity) · Complexity: M · Stadium-safe: **YES — the headline moment of the demo, build first among feature slices if re-sequenced under time pressure**

## Slice 4 — Financial memory ②: decisions + commitments + reminder surface (Beats 4, 5)
**Goal:** decisions/commitments as first-class queryable records; user-visible on the rail; injected into agent context.

- Tables: `decisions`, `commitments`, `memories`
- API routes: `/api/agent` (adds `pfos_memory_set_decision`, `pfos_memory_set_commitment`)
- UI: MemoryCard list (decisions + commitments + preferences, newest first), ReminderCard (open commitments + decisions with future-dated/expiry hints)
- Acceptance: (a) Beats 4 and 5 trace exactly; (b) the headphone decision (Slice 3) auto-links to the transaction (linked_transaction_id) and Beat 5 can answer "why…?" from it, showing the linked amount in-line; (c) serialization: no memory row inside a transaction-able draft flow (data-loss check: reset then Beats 1–5, verify all memory rows survive)
- Risk: LOW · Complexity: S/M · Stadium-safe: YES

## Slice 5 — Tiffin meter ③: meal drafts + tiffin summary card (Beats 6, 7)
**Goal:** never-silently-assume consumption; statuses + payable math in Postgres; status card never inventing user intent.

- Tables: `meal_types`, `meal_consumption`, `tiffin_subscriptions`
- API routes: `/api/agent` (adds `pfos_meal_log_consumption_draft` + `pfos_meal_confirm_consumption`), `/api/confirm` (entity meal)
- UI: MealDraftCard (three status chips, user-amendable), TiffinCard refresh
- Acceptance: (a) Beats 6 & 7 trace exactly; (b) `get_tiffin_summary` returns exactly `5 consumed / 2 skipped / 1 cancelled` after both Beats, verified by a status-permutation test (each status flips 0↔1 in a fixture DB); (c) payable invariant holds: `billed ₹500, prepaid balance ₹4,000, payable ₹0`; (d) an ambiguous "swapped my tiffin" (no meal type) always asks, never drafts
- Risk: MEDIUM (status semantics ambiguity; ask-back must be smooth) · Complexity: M · Stadium-safe: YES

## Slice 6 — Reports ④: narrative daily + monthly report cards (Beats 8, 9)
**Goal:** two deterministic report cards with LLM-added one-liners; charts = plain HTML/SVG bars if needed.

- Tables: read-only (uses RPCs)
- API routes: `/api/agent` (adds `pfos_ledger_get_report`), `GET /api/fin/context` (rail includes a mini month-glance card)
- UI: ReportCardDaily, ReportCardMonthly (category table in `₹`, HTML/CSS bars width-proportional to spend; NO charting lib)
- Acceptance: (a) Beats 8 & 9 trace exactly (daily ₹3,120 = 120 + 3,000, monthly ₹4,565 = 45% of ₹10,200, recurring candidates from S1/S2 pairs); (b) an LLM-sabotage test: tool result injectable number `9999` does not round-trip into the card (rendering never exceeds RPC tokens); (c) round-off invariant: `sum(category_rows) == grand total` on seeded case; (d) monthly card renders `0 rows` safely (empty-month snapshot)
- Risk: LOW (determinism is the risk, plan mitigates) · Complexity: S/M · Stadium-safe: YES

## Slice 7 — Hardening: demo polish + idempotency-by-design + ₹ format + E2E golden replay
**Goal:** five unscripted chat phrasings reviewed by hand + an idempotency-collision test + ₹ formatting galore + the golden demo recorded.

- Tables: none new (audit + fixes)
- API routes: none new
- UI: response latency polish (streaming of the prose part if cheap), loading skeletons (slow LLM indicator), footer "Demo seeded Nov 2026 · Reset"
- Acceptance: (a) 5 unlisted phrasings ("upar wale ne ₹500 kharch kiya", "only 8 swiggy orders this time" as intent-mod, "dinner lunga" etc.) answered without invented numbers; (b) Playwright replay of the full §2.6 script green in CI; (c) `audit_log` shows exactly one row per Confirm regardless of double-clicks; (d) Lighthouse perf ≥ 85 on `/`; (e) draft-then-confirm **always** visible with "Estimated" badges, never pre-confirmed
- Risk: LOW · Complexity: S/M · Stadium-safe: YES (E2E must not block other slices)

## Slice 8 — Stretch ⑤: yearly trends (CUT TARGET)
**Goal:** only if Slices 1–7 complete + deck/README started. Monthly spend trend list, biggest month, savings-trend line — HTML bars, no charting lib.

- Tables: read-only; small extension to `get_month_summary` (list of monthly snapshots Nov-ish window)
- Acceptance: (a) validated against 2 seeded months (Oct + Nov); (b) numbers cross-check to RPC not LLM; (c) feature-flagged OFF by default
- Risk: LOW · Complexity: M · Stadium-safe: NO — **skippable without demo impact**

### Re-sequencing contingency

If running late: Slice 8 is cut outright; Slice 6's monthly report absorbs the year-trend one-liner capability via `period:"2026-Q"` shorthand (not part of demo script, judged-optional); Slice 7's E2E is demoted to a locally-run "manual golden walk" checklist. Slices that must never lose content: 3, 5.

---

# §4 Schema (Supabase / Postgres)

Conventions: all tables `created_at timestamptz default now()`. Money = **bigint `*_in_minor_paise`** (₹ × 100). Dates = `date` (IST day; no timestamp ambiguity). User-owned FK per row.

## 4.1 Core ledger

```sql
-- expense_categories (reference table; shared across users in MVP)
create table expense_categories (
  id uuid pk default gen_random_uuid(),
  name text not null unique,          -- 'food','transport','discretionary','tiffin','bills'
  kind text not null check (kind in ('expense','income')),
  is_discretionary boolean not null default false
);

-- category_budgets (month-agnostic, one active set per category for MVP)
create table category_budgets (
  id uuid pk default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001', -- DEMO_USER constant (§4.3)
  category_id uuid not null references expense_categories(id),
  monthly_amount_in_minor_paise bigint not null check (monthly_amount_in_minor_paise > 0),
  unique (category_id) -- MVP: one active budget per category
);

-- transactions (the ledger)
create table transactions (
  id uuid pk default gen_random_uuid(),
  user_id uuid not null default DEMO_USER,
  occurred_on date not null,
  kind text not null check (kind in ('expense','income')),
  category_id uuid not null references expense_categories(id),
  amount_in_minor_paise bigint not null check (amount_in_minor_paise > 0),
  note text,
  source text not null check (source in ('chat','manual','seed')),
  status text not null default 'estimated' check (status in ('estimated','confirmed')),
  created_at timestamptz default now(),
  confirmed_at timestamptz
);
create index on transactions (user_id, occurred_on);
create index on transactions (user_id, status);              -- the confirm card query
create index on transactions (user_id, category_id, occurred_on); -- report + budget aggregation
```

## 4.2 Memory + audit + demo

```sql
-- commitments (first-class, "cap Swiggy at 8 orders/month")
create table commitments (
  id uuid pk default gen_random_uuid(),
  user_id uuid not null default DEMO_USER,
  subject text not null,               -- 'Swiggy'
  text text not null,                  -- 'Cap Swiggy at 8 orders a month'
  rule_type text not null default 'monthly_count' check (rule_type in ('monthly_count','monthly_cap','open_ended')),
  numeric_limit integer,               -- 8
  start_on date not null default current_date,
  status text not null default 'open' check (status in ('open','done','dropped')),
  created_at, idempotency_key text unique
);

-- decisions (first-class, linked transaction optional)
create table decisions (
  id uuid pk default gen_random_uuid(),
  user_id uuid not null default DEMO_USER,
  text text not null,                  -- 'Headphones ₹3,000 — planned purchase'
  linked_transaction_id uuid references transactions(id),
  confidence numeric(3,2) not null default 0.80,
  decided_on date not null default current_date,
  created_at, idempotency_key text unique
);

-- memories (preferences & loose context)
create table memories (
  id uuid pk default gen_random_uuid(),
  user_id uuid not null default DEMO_USER,
  type text not null check (type in ('preference','note')),  -- decisions/commitments live elsewhere
  scope text not null,                                       -- 'spending','food','routing','lifestyle'
  text text not null,
  confidence numeric(3,2) not null default 0.80,
  expires_on date null,                -- infers system can drop it later
  created_at
);

-- audit_log (every LLM tool invocation; unique key kills replays)
create table audit_log (
  id uuid pk default gen_random_uuid(),
  user_id uuid, ts timestamptz default now(),
  route text not null,                 -- '/api/agent'
  tool_name text not null,             -- from whitelist; 'unknown' for rejects
  model text,                          -- e.g. 'openrouter/llama-3.3-70b-instruct'
  args jsonb,                          -- canonical zod-parsed JSON (or raw on reject)
  result_digest text,                  -- first 32 chars sha256 of result JSON
  approval_state text not null check (approval_state in ('auto','user_confirmed','rejected')),
  latency_ms int, error boolean not null default false,
  idempotency_key text not null unique,  -- sha256(tool | canonical args | user | request_id)
  request_id uuid
);

-- demo_config (seed bookkeeping)
create table demo_config (
  id smallint pk default 1 check (id = 1),  -- single-row guard
  seed_version text not null,
  seeded_at timestamptz default now(),
  is_demo boolean not null default true
);
```

## 4.3 RLS policy note (demo-mode honesty)

RLS **enabled** on `transactions, category_budgets, commitments, decisions, memories, meal_types, meal_consumption, tiffin_subscriptions` (+ read on `expense_categories`, `audit_log` insert-only). In MVP demo mode all policies are permissive single-user (`user_id = DEMO_USER` via service role — server-side calls ride the service key) so **no auth flow blocks the demo**. The schema and RLS scaffolding already anticipate the SaaS path; the swap (add `auth.users` FK, policies `auth.uid() = user_id`, drop permissive mode) is documented verbatim in `docs/saas-migration.md` as Slice 7+ (post-MVP; see §8 cut list R3).

## 4.4 Tiffin + RPC money math (canonical signatures)

```sql
create table meal_types (
  id uuid pk default gen_random_uuid(),
  user_id uuid not null default DEMO_USER,
  name text not null,                                        -- 'breakfast','lunch','dinner','late_night_snack'
  plan text not null check (plan in ('prepaid','custom')),   -- prepaid=subscription-covered; custom=billed extra
  default_price_in_minor_paise bigint not null               -- 10000 (₹100); custom e.g. 6000 (₹60)
);

create table meal_consumption (
  id uuid pk default gen_random_uuid(),
  user_id uuid not null default DEMO_USER,
  occurred_on date not null,
  meal_type_id uuid not null references meal_types(id),
  status text not null check (status in ('consumed','skipped','cancelled')),
  record_status text not null default 'estimated' check (record_status in ('estimated','confirmed')),
  price_at_record_time_in_minor_paise bigint not null,       -- copied from meal_types at draft time (copy-on-draft policy below)
  note text, source text not null check (source in ('chat','manual','seed')),
  created_at
);
create unique index on meal_consumption (user_id, occurred_on, meal_type_id, record_status); -- double-capture guard per status
create index on meal_consumption (user_id, occurred_on);

create table tiffin_subscriptions (
  id uuid pk default gen_random_uuid(),
  user_id uuid not null default DEMO_USER,
  cycle_month date not null,             -- first of cycle, '2026-11-01'
  prepaid_meals integer not null,        -- 45
  price_in_minor_paise bigint not null,  -- 10000 (₹100)
  prepaid_amount_in_minor_paise bigint not null, -- 450000 (₹4,500); integrity guard: prepaid_meals*price = prepaid_amount
  paid_on date,
  unique (user_id, cycle_month)
);
```

**Payable model (normative):** prepaid covers plan meals; a month's consumed plan meals bill against the prepay; custom meals always bill at their price. Then `prepaid_balance = prepaid_amount − billed_plan` (may go negative) and `payable_now = max(0, −prepaid_balance) + custom_billed`. Skipped and cancelled are recorded but **not payable**; both remain as queryable rows.

### RPC signatures (money math; security-definer; all return jsonb)

```sql
-- money mutations (draft-then-confirm; idempotent)
create function create_transaction_draft(
  p_kind text, p_category_name text, p_amount_in_minor_paise bigint,
  p_occurred_on date, p_note text, p_source text, p_idempotency_key text)
  returns jsonb; -- {transaction} with status='estimated'
create function confirm_transaction(p_transaction_id uuid, p_idempotency_key text)
  returns jsonb; -- {transaction} status='confirmed' (idempotent no-op if already confirmed)
create function create_meal_consumption_draft(
  p_occurred_on date, p_meal_type_id uuid, p_status text,
  p_note text, p_source text, p_idempotency_key text)
  returns jsonb; -- {meal_consumption} record_status='estimated' (price copied at record time)
create function confirm_meal_consumption(p_meal_id uuid, p_idempotency_key text)
  returns jsonb;
create function create_commitment(p_subject text, p_text text, p_rule_type text,
  p_numeric_limit integer, p_idempotency_key text) returns jsonb;
create function create_decision(p_text text, p_linked_transaction_id uuid,
  p_confidence numeric, p_idempotency_key text) returns jsonb;

-- aggregations (read; deterministic)
create function get_budget_status(p_month date default date_trunc('month', current_date))
  returns jsonb; -- per-category [{category_id, is_discretionary, spent, budget, remaining_or_over}]
create function get_tiffin_summary(p_month date default date_trunc('month', current_date))
  returns jsonb; -- {prepaid_meals, price, prepaid_amount, consumed, skipped, cancelled,
                 --  billed_to_date, prepaid_balance, custom_billed, payable_now, remaining_prepaid}
create function get_day_summary(p_day date) returns jsonb; -- {expenses_total,income_total,by_category,
                 --  by_status_counts, budget_status (via get_budget_status), tiffin:{day counts}}
create function get_month_summary(p_month date) returns jsonb; -- {expenses_total,income_total,by_category,
                 --  txn_count, budget_violations:[], tiffin (via get_tiffin_summary),
                 --  prev_month:{total, by_category}, recurring_candidates:[{label,pattern}]};
create function get_financial_context(p_day date default current_date)
  returns jsonb; -- {budgets (top-3 by remaining), recent_txns (last 10 confirmed: light fields only),
                 --  open_estimated_count, open_commitments, recent_decisions (last 5), tiffin_snapshot (counts only)}

-- demo
create function seed_demo_data() returns jsonb; -- writes exactly the §2.3 fixtures; idempotent by seed_version
create function reset_demo_data() returns jsonb; -- truncate demo user rows + seed_demo_data(); single tx
```

### Category auto-classification policy (normative)

- The LLM proposes a category **from the restricted whitelist of active categories** (`food, transport, discretionary, tiffin, bills`), given the whitelist in the system prompt.
- The **executor validates** the proposed category name against `expense_categories` (existence + kind) — value range is enforced by zod (`enum(...)` locked to the same fixed list) **before** any RPC.
- **Postgres never decides.** If the LLM omits or sends an invalid category, the executor neither "rescues" it silently nor guesses: it returns `tool_error` with a `re_ask:true` cue so the assistant requests clarification in one sentence.
- Budget overflow detection (headphone trigger) also **does not live in Postgres**: the executor calls `get_budget_status` and applies the §2.5 rule 4 (discretionary-plan + ≥ half remaining budget) as an **executor-side branch**, exposing a boolean `overflow_warning` in the tool result. Postgres reports; the executor routes.
- `price_at_record_time` on meal rows is RPC-internal (copy-on-draft); meal price changes never mutate history.

---

# §5 API / agent design

## 5.1 Routes

| Route | Method | Purpose | Body / Params → Return |
|---|---|---|---|
| `/api/agent` | POST | The single weave loop | {messages: [{role, text, tool_cards_evicted?}] } → {reply, cards: [DraftCard…], refresh: boolean} |
| `/api/confirm` | POST | User clicks Confirm on a draft card | {entity:'transaction' \| 'meal', id, idempotency_key} → {updated entity row, refresh: true} |
| `/api/fin/context` | GET | Rail hydration (home + post-refresh) | (none) → jsonb = `get_financial_context()` output |
| `/api/demo/reset` | POST | Reset demo | (none) → {seeded: true, seed_version} |

Server reads go through **server components** calling RPCs directly (no extra route); `/api/fin/context` exists purely for post-Confirm rail refresh. There is **no client-side RPC access** for writes, ever.

## 5.2 Tool whitelist (8 tools — namespaced, hard-coded, versioned `pfos-tools/1`)

| Tool | Kind | Arity | Purpose |
|---|---|---|---|
| `pfos_ledger_log_expense_draft` | write | 1 arg | create an **estimated** transaction; never computes totals |
| `pfos_ledger_confirm_transaction` | write | 1 arg | promote an estimated txn to confirmed (executor-in-reply only; the primary path is the card Confirm button → `/api/confirm`; the tool call mirrors it for clear conversational "confirmed" language, same RPC) |
| `pfos_ledger_get_financial_context` | read | 1 arg | budgets snapshot + recent txns + open meals pre-aggregated (no math) |
| `pfos_ledger_get_report` | read | 1 arg | daily or monthly deterministic summary (LLM-after layered context) |
| `pfos_meal_log_consumption_draft` | write | 1 arg | create an estimated consumption row with status (consumed/skipped/cancelled) |
| `pfos_meal_confirm_consumption` | write | 1 arg | promote an estimated meal record |
| `pfos_memory_set_commitment` | write | 1 arg | record a commitment (subject, limit, rule_type) |
| `pfos_memory_set_decision` | write | 1 arg | record a decision (+ linked_transaction_id optional) |

Note: `pfos_memory_set_*` mutations are "auto-apply" (no user confirm) because they're reversible, non-financial state — but they still each write `audit_log` rows with approval_state `auto` and unique idempotency keys. **`get_budget_status` is NOT a direct tool** — the §2.5 rule-4 overflow check runs inside the executor and its fetched budget snapshot is embedded in the (draft-approval) tool result; saves a full round trip and makes the headphone beat atomic.

## 5.3 Tool JSON schema example (connector format, OpenAI-style `tools:[...]`)

```json
{
  "type": "function",
  "function": {
    "name": "pfos_ledger_log_expense_draft",
    "description": "Create an ESTIMATED expense/income row. NEVER confirms it. The user must click Confirm. Do not invent amounts.",
    "parameters": {
      "type": "object",
      "required": ["amount_in_minor_paise", "category", "occurred_on", "source"],
      "properties": {
        "amount_in_minor_paise": {"type": "integer", "minimum": 1, "description": "₹ × 100. ₹120 → 12000."},
        "category": {"type": "string", "enum": ["food","transport","discretionary","tiffin","bills"]},
        "kind": {"type": "string", "enum": ["expense","income"], "default": "expense"},
        "occurred_on": {"type": "string", "format": "date", "description": "YYYY-MM-DD. 'today' resolves server-side from IST."},
        "note": {"type": "string", "maxLength": 120},
        "source": {"type": "string", "enum": ["chat"], "default": "chat"}
      }
    }
  }
}
```

```json
{
  "type": "function",
  "function": {
    "name": "pfos_meal_log_consumption_draft",
    "description": "Create an ESTIMATED meal record for a date. Status must be EXPLICIT from the user; never infer consumption.",
    "parameters": {
      "type": "object",
      "required": ["occurred_on", "meal", "status"],
      "properties": {
        "occurred_on": {"type": "string", "format": "date"},
        "meal": {"type": "string", "description": "meal_types.name; validate against seeded list"},
        "status": {"type": "string", "enum": ["consumed","skipped","cancelled"]},
        "note": {"type": "string", "maxLength": 120}
      }
    }
  }
}
```

*(The remaining 6 schemas follow the same pattern; they ship as `lib/agent/tools.ts` typed exports and zod mirrors in Slice 2.)*

## 5.4 Executor (single place, server-side)

- Route `/api/agent`; zod parses args; dispatch via a `switch` on `tool_name` — an unknown tool → `tool_error` + `audit(approval_state='rejected')`.
- Executes the matching Supabase RPC (service key), stamps `request_id`, measures latency, awaits `result_digest`.
- Wraps every returned money/result in an **immutable envelope** (`snapshotToken`); the LLM only receives the tool's own output verbatim. No arithmetic, no formatting at the tool-arg layer.
- On any RPC error, returns a `tool_error` tool result (still logged) instead of exploding the weave.

## 5.5 Agent flow (pseudocode, canonical for the route)

```python
# POST /api/agent
def agent_weave(messages, request_id):            # ONE weave loop; safety valve: max 3 tool iterations
    for _ in range(3):

        # 1) Ask the LLM. It sees ONLY: system rules (§2.5) + conversation + past tool results.
        response = llm.chat(MODEL, messages, tools=TOOL_WHITELIST, system=SYSTEM_PROMPT)

        # 2) Pure prose answer case → stream back to the chat pane, done.
        if not response.tool_calls:
            return stream(response.text)          # cards=[] (or carried from earlier), refresh=false

        # 3) Tool-call case: exactly ONE tool per iteration (weave: tool → validated result → reply).
        call = response.tool_calls[0]

        # 4) VALIDATE against the zod whitelist. Unknown tool or bad args → tool_error, audited, no RPC.
        if call.name not in WHITELIST_MAP:
            tool_result = tool_error(code="unknown_tool", allowed=sorted(WHITELIST_MAP))
        else:
            args = WHITELIST_MAP[call.name].schema.parse(call.arguments)   # zod; raises → tool_error("bad_args")

            # 5) EXECUTOR-SIDE OVERFLOW GATE (§2.5 rule 4) — runs BEFORE creating a discretionary draft.
            #    Skipped when an `intent_acknowledged` flag is already set for this request session
            #    (i.e. the assistant asked on the previous turn and the user just affirmed "yes, planned").
            if (call.name == "pfos_ledger_log_expense_draft"
                    and is_discretionary(args.category)
                    and not state.intent_acknowledged):
                budgets  = rpc.get_budget_status(today_month())            # deterministic numbers only
                d        = budgets["discretionary"]                        # {budget, spent, remaining}
                if args.amount_in_minor_paise > d.remaining / 2:           # headphone-class capture
                    tool_result = {
                        intent_required: True,
                        display: {category: args.category,
                                  budget: d.budget, remaining: d.remaining,
                                  overflow: args.amount_in_minor_paise - d.remaining},
                        question: "Record as a planned purchase?"
                    }
                    state.intent_pending = True                            # next turn's affirmation resets the gate
                    audit_log(tool=call.name, args=args, approval_state="rejected",
                              idempotency_key=sha256(call | args | request_id))
                    messages.append(tool_response(call, tool_result))      # LLM says context + asks (one turn)
                    continue                                               # NO draft row created

            # 6) EXECUTE the whitelisted RPC. This is the only state change the agent can induce.
            idem_key  = sha256(call.name | canonical_json(args) | user_id | request_id)
            rpc_result     = rpc.call(call.name, with_idempotency_args(args, idem_key))
            tool_result    = rpc_result.content                    # immutable envelope, verbatim from Postgres
            approval_state = "user_confirmed" if call.name.endswith("confirm") else "auto"
            audit_log(tool=call.name, args=args, model=MODEL, result_digest=sha256(tool_result)[:32],
                      approval_state=approval_state, latency_ms=rpc_result.ms, idempotency_key=idem_key)

        messages.append(tool_response(call, tool_result))          # loop; LLM replies or calls again

    # 7) Tool-loop cap reached → bail politely. NEVER guess numbers to compensate.
    return "Let's take that one step at a time — what would you like to do first?"
```

**Non-negotiable, state out loud: the LLM never computes money math; every number shown to the user comes from RPC output.** Numbers exist in tool results; the LLM’s job is to pick 1–3 and phrase the context.

## 5.6 Reset demo (dev/ops surface)

- `POST /api/demo/reset` is a **single server action**, only allowed when `NEXT_PUBLIC_PFOS_DEMO_MODE=1` env-var guard, and always wiped from prod (feature-flag).
- All seeded rows (audit included) have a stable `source`/marker type so reset can distinguish demo data from anything else in about a one-liner (`delete where user_id=DEMO_USER`).
- Also exposed in the UI as TopBar "Reset demo", which reloads the page after POST. **Idempotent by reset; any demo state can always be returned to (including a mid-demo misfire).**

---

# §6 Stack decisions + versions

| Concern | Decision | Why |
|---|---|---|
| Framework | **Next.js 15.x (App Router)** on Vercel | stable SSR(server components) + server actions; HACKATHON.md spec |
| Language | **TypeScript 5.x, strict:true** | tool + RPC typed surface |
| Supabase | **@supabase/supabase-js v2 + @supabase/ssr** (auth stub off, demo user mode) | Postgres + RPC is the heart; RLS enabled |
| Validation | **zod v3.24** (supabase tool-call schemas) | executor is the trust anchor |
| LLM provider | **OpenRouter, open-weight default `meta-llama/llama-3.3-70b-instruct`** (tool-calling capable; India-friendly cost for demo), OpenAI-compatible SDK with `baseURL=https://openrouter.ai/api/v1` | open-weight compatible per docs/brief note; **fallback: `openai/gpt-4o-mini`** (same schema, one env var swap). Provider fidelity risk → §7 HIGH |
| Styling | **Tailwind CSS v4 + shadcn/ui** (Card, Button, Badge, Input, ScrollArea — 5 components, nothing more) | fastest slide toward the demo look; shadcn lets the 3 rail card types look crisp with no design cost. **All visual tokens (Fraunces + IBM Plex Sans/Mono, paper/ink/semantic palette, radii, state treatments) read from `docs/design-direction.md` — that file is canonical for Phase 4 UI code.** |
| Dates | **dayjs** (IST zone) | tiny; day resolving ("today") is IST-safe |
| Tests | **vitest** for zod schemas + RPC integration tests (via local supabase CLI or direct pg with a seeded spin) | test-first at slice boundaries (ECC TDD rule). Playwright **only in Slice 7** for the golden-demo E2E |
| Charting | **None.** Category tables + plain HTML/CSS bar widths | determinism > polish; no new dependency. Post-MVP candidate if slide ④ wants a visual: **recharts (light, React-native, SVG-based)** |
| DB client for tests | `supabase start` (CLI, Postgres via docker) mirroring migrations locally | verifies `p_month` arithmetic against seed exactly, not a hand-rolled model |

**Dependency minimization budget:** ≤ 14 runtime packages. Any addition needs justification at the slice where it's proposed; otherwise cut.

---

# §7 Dependencies + risks

| # | Risk | Sev | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **LLM provider availability/cost/latency for demo** (OpenRouter free tier throttles; open-weight tool-calling reliability varies) | **HIGH** | demo sessions erase the honest-agent story on a tool-not-parsed toolcall | (a) hard-cap weave at 3 iterations (§5.5); (b) `gpt-4o-mini` fallback behind env var, identical schema; (c) audit-log the raw tool args even on failures — making unknown-tool answers graceful as "sorry, that wasn't in my allowed tools"; (d) load-bearing tool fixtures tested in vitest pre-demo; (e) stream token-by-token so latency is invisible while tool waits are amortized |
| 2 | **₹ formatting / minor-unit decision drift** | MED | a ₹4,500 display showing "45,000" or "4500.00" invites scale questions and doubts about correctness | **canonical: `bigint` minor paise; format exactly once at render** via `formatINR(minor)` (tiny utility, verified by vitest round-trip); `formatINR` also does the `₹2,500` Indian digit grouping; no UI-local numeric logic allowed (ESLint ban on `toLocaleString` outside the util) |
| 3 | **RLS + demo-user auth friction** | MED | an auth wall eats one demo minute and erodes the "I just open it" feel | **single demo user + permissive demo policy + service key on writes** (§4.3); real auth is post-MVP SaaS (§8, R3); honest demo has a README note listing "auth next" |
| 4 | **Report correctness vs determinism** — LLM "coloring" drifting numbers | **HIGH** | a monthly card with off-by-small-₹ numbers destroys the whole pitch | **rendering reads only RPC outputs** (server components fetch and display; the LLM never renders the card). The LLM adds TWO sentences max per card (§2.8 rule). vitest invariant: RPC `card.sum == Σ(card.rows)` on seeded fixtures. This is why Slice 6's acceptance test (b) probes more strictly than §2.6 Beat 9 |
| 5 | **Tiffin status edge cases** (cancelled = not payable, skipped = not payable, both recorded — intent language gets twisted) | MED | double-code paths | §4.4 unique index `(user, date, meal_type, record_status)` plus timezone-safe `get_tiffin_summary` checks + acceptance test 5(d) explicitly covers ask-back on ambiguous phrases (slice 5). Payment implication (refund/credit) is out — payable is computed against the current month, never projected into the future |
| 6 | **Token/context inflation** (context rail + decisions + report grows) | MED | latency + $ cost on the OpenRouter free tier creep up; beats timeout pauses | context tool returns a **hard-capped shape** (§4.4 `get_financial_context`: top-3 budgets, 10 txns, 5 decisions, counts only), messages trimmed to last 12 with each turn compressed to plain-text summary of what tool did |
| 7 | Seed/copy drift between §2.3 and `seed_demo_data()` implementation | MED | mid-demo numbers off-by-paise | one ts fixture file (`data/seed-fixtures.ts` typed; §2.3 column = expected values, tested in vitest as the *single source* both the SQL seed script and UI test fixtures consume) |
| 8 | Supabase RPC migration ordering (draft-tables missing → partial demo) | LOW | — | single migration directory enforced early (Slice 1) |

---

# §8 Cut list (explicit — with revisit notes)

| # | Cut | Rationale | Roadmap note, revisit when |
|---|---|---|---|
| R1 | **Bank sync / UPI / account aggregation** | aggregator plumbing is huge + kills the honest-agent pitch (LLM-only via chat, no auto-records) | When SaaS real users demand it; UPI SMS parsing deserves its own research phase = revisit in PII-secure ingestion phase |
| R2 | **Voice input** | research supports it as preference but hardware + ASR plumbing is non-demo | After deck/video; browser `MediaRecorder` + Whisper-style ASR as Slice 8+ candidate |
| R3 | **OCR receipts / image upload** | out of demo scope; VLM cost + parsing drift | After memory surfaces prove sticky; VLM passes through the same tool whitelist (capture doesn't change) |
| R4 | **Multi-user SaaS / auth flex** | demo friction + zero demo value; schema already SaaS-shaped (§4.3) | When the first real user onboards; real `auth.users`, RLS policies, billing are one migration batch |
| R5 | **Charting beyond 2 simple HTML/CSS bars** | dependency cost for marginal demo value | `recharts` candidate when reports go PDF export (Slice 8+) |
| R6 | **WhatsApp / SMS bridge** | tempting India-flavored capture vector but out of demo scope | Post-MVP when a real channel hangs it; same executor/tool whitelist applies |
| R7 | **Push notifications, email digests** | in-app messaging is complete for the MVP reminder surface | When reminders go cross-channel (Slice 8+); cron on Vercel = trivial |
| R8 | **Onboarding wizard** | demo runs on seeded state (§2.3); a wizard buries the first win | When real users hit day-1 cold-start post-SaaS (R4) |
| R9 | **Yearly trends (Slice 8) if time runs out** | cut target by design; monthly report absorbs a light month-comparison | Returns when slice 1–7 are solid + deck/video complete |
| R10 | **Receipt-generation / PDF monthly statement** | gallery polish over demo meat | Slice 8+ after monthly narrative card |
| R11 | **Savings/investment tracking** (income + savings rate exists; investments don't) | out of wedge (memory-first capture ≠ wealth mgmt) | Custom when a user stories the notebook ("my ₹10k folio →") shape |

---

# §9 Estimated complexity + timeboxes

Assumption: **one competent senior dev + an agent pair** (implement helper), sequential slices; tests per ECC TDD rule at slice boundaries; "day" ≈ 6 focused hours. Stack familiarity assumed high (Next.js, Supabase already chosen by user).

| Slice | Name | TDD head | Impl | Demo check | **Total** | Stadium-safe? |
|---|---|---|---|---|---|---|
| 1 | Scaffold + schema + seed + reset | 0.5d | 1.0d | 0.5d | **2.0d** | YES |
| 2 | Agent backbone (weave + read-only tool) | 0.5d | 1.0d | 0.5d | **2.0d** | YES |
| 3 | Capture ① (draft → confirm → budget; headphone moment) | 0.5d | 1.5d | 0.5d | **2.5d** | **YES — headline beat** |
| 4 | Memory ② (decisions + commitments + reminders) | 0.5d | 1.0d | 0.25d | **1.75d** | YES |
| 5 | Tiffin ③ (meal drafts + summary card) | 0.5d | 1.0d | 0.5d | **2.0d** | YES |
| 6 | Reports ④ (daily + monthly cards) | 0.5d | 1.0d | 0.5d | **2.0d** | YES |
| 7 | Hardening (scripts + polish + E2E golden demo) | 0.5d | 1.5d | 0.5d | **2.5d** | YES |
| **1–7 subtotal** | | | | | **~14.75d** | |
| 8 | Stretch ⑤ yearly trends | — | 1.5d | 0.5d | **2.0d** | **NO — cut** |

**Notes**

- Beats 1–9 (§2.6) therefore come online **cumulatively**: demoable after 3 (capture+overflow), 4 (memory), 5 (tiffin), 6 (reports), stable after 7.
- SEQUENCE risk: do **not** round-robin. Each slice is demo-checked against §2.6 beats it owns before moving on. Slice 3 is the one to protect at a defensive margin.
- Body of work assumed parallelizable only in CSS/cards (the agent pair can render rail cards while the dev integrates RPCs), everything else sequential.

---

# §10 Checkpoint Verdict

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CHECKPOINT VERDICT (Phase 3)                                            │
│                                                                         │
│ Plan doc complete: YES (§1–§9)                                          │
│ Slice reproducibility audit: PENDING USER REVIEW                        │
│                                                                         │
│ ▢ APPROVED — proceed to Phase 4 (build) ✔ SIGNED 2026-11-03             │
│     (with design-direction revision pass: docs/design-direction.md      │
│      "Quiet Ledger" committed; §2.1 + §6 amended accordingly)           │
│ ▢ REVISE — return with notes: [ ]                                       │
│                                                                         │
│ This box is intentionally unsigned. No build work starts until the      │
│ user (for whom this whole plan exists) reviews it and ticks APPROVED.   │
└─────────────────────────────────────────────────────────────────────────┘
```
