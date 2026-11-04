# PFOS build state — current phase, slice log, decisions (append-only)

Note: this file was named HACKATHON.md internally while the project was built
inside a hackathon-pipeline harness; the harness name is not public-facing,
so it lives here in docs/ under a descriptive name.


Status: phase-4 | build in progress (Slice 5 — tiffin meter)

## Slice log (append-only)
- [x] **Slice 4 — Memory ②** (2026-11-04): decisions + commitments as
      first-class records. Released `pfos_memory_set_commitment` and
      `pfos_memory_set_decision`; executor validates
      `linked_transaction_id` ownership (rejects dangling refs with
      `transaction_not_found` + audit `rejected`); non-money writes audit
      `approval_state='auto'`. Weave threading: draft → iteration-2 sees
      the row id in the tool envelope → decision links automatically
      (Beat 3 acceptance b, verified by scripted dynamic LLM test).
      Serialization (acceptance c): reset → Beats 1–4 → all memory rows
      survive; no memory row ever lands inside a transaction flow.
      Envelope contract unified: write-path tools return
      `{status:'ok', result:{row, …}}`; context tool passes through raw.
      Rail memory surface renders seeded decision + open commitments;
      chat shows quiet "Decision · open" / "Commitment · open" cards.
      vitest 37/37 GREEN. Discretion/patience note: no ReminderCard
      added — the rail Memory card lists open commitments with rule
      labels (avoids duplication); revisit if demo shows it's missed.
- [x] **Slice 3 — Capture ①** (2026-11-04): the headphone moment. Released
      `pfos_ledger_log_expense_draft` + `pfos_ledger_confirm_transaction`
      (executor dispatch to `create_transaction_draft` / `confirm_transaction`
      RPCs; verbatim Postgres rows; draft envelope carries the budget
      snapshot — get_budget_status is not a live tool). Executor-side
      overflow gate intercepts discretionary drafts > ½ remaining budget
      unless `intent_acknowledged` (returns `intent_required` + audit
      `approval_state=rejected`, **zero rows written**). Confirm idempotent
      by RPC (re-click = no-op, returns confirmed row). UI: Draft card
      (pencil-dash → stamped "Confirmed", Quiet Ledger signature), ≡ Tool
      chips, rail refreshes via `router.refresh()` after confirm. vitest
      32/32 GREEN incl. Beat-1/2/3 trace, Confirm double-click, re-run-safe
      suites. Notes: (a) vitest file parallelism disabled — the local stack
      is shared mutable state and files must run in order; (b) tool
      envelopes are wrapped `{status:'ok', result:{row, ...}}` uniformly;
      (c) audit `args` for gate rejections stores `{requested, gate}` —
      the weave test asserts the intercept shows up as rejected audit, no
      draft row. Beat 0 state restored via demo reset before push.
      TODO for release demo: set OPENROUTER_API_KEY (tool-calling fidelity
      unverified live).
- [x] **Slice 2 — Agent backbone** (2026-11-03): weave loop (`lib/agent/weave.ts`,
      §5.5, cap 3 iterations, verbatim tool-result envelopes), executor
      (`lib/agent/executor.ts`: unknown → `tool_error`+audit(rejected),
      bad-args zod-strict → audit(rejected), unreleased-tool slice gating,
      sha256 idempotency keys — same (tool|args|user|request) replays collapse
      to one audit row by design), `audit_log` writes for every path
      (`route:'/api/agent'`), OpenRouter provider seam via plain fetch
      (`lib/agent/llm.ts`, 503 + quiet inline message without key),
      `POST /api/agent` route (zod-validated body), real ChatPane (bubbles,
      ≡ Tool chips from `toolTrace`, Enter-to-send, aria-live log, quiet
      error states). vitest 26/26 GREEN (10 new weave-executor tests with
      scripted fake LLM against the real stack; tsc clean). SITE TODO: set
      `OPENROUTER_API_KEY` in .env.local before demo use — accuracy of tool-
      calling on llama-3.3-70b unverified until then (fallback env-var gpt-4o-mini ready).
      Notes: request_id must be a uuid (audit column); no-key path verified.
- [x] **Slice 1 — Foundation** (2026-11-03): full schema migration `0001_init.sql`
      (11 tables, RLS deny-all, 13 RPCs, §2.3 seed + reset) validated against
      postgres:17 + applied to local Supabase stack; app shell (Quiet Ledger:
      TopBar + ContextRail + ChatPane placeholder) renders exact §2.3 rail
      numbers; `/api/demo/reset` + `/api/fin/context` live; vitest 16/16 GREEN
      (tool-schemas 12 + seed-contract 4); tsc clean. Notes: (a) seed fixed to
      pre-demo tiffin 4·1·0 · billed ₹400 · balance ₹4,100 (§2.3 table had an
      extra consumed row; line 109/rail/Beat-7 arithmetic is authoritative);
      (b) local stack preloads `safeupdate` — every DELETE needs an explicit
      WHERE; (c) `date_trunc('month', date)` promotes to timestamptz — cast
      `::date` at every RPC call site.
Deadline: none (product build at user's pace)
Time remaining: unconstrained — pipeline pacing still enforced

## Context
- Hackathon / theme: none — self-directed product build, hackathon pipeline used for discipline
- Rules & eligibility: N/A (no external hackathon)
- Submission format: public web demo (Vercel/Netlify) + full win package (deck, video, README, checklist)
- Team size / mode: solo, sequential build (Team mode declined at kickoff)
- Tech constraints: Next.js (App Router) + Supabase (Postgres, auth) + LLM via tool-calling
- Agentic layer: LLM with a fixed, whitelisted tool schema — deterministic math stays in code; LLM only interprets NL and calls tools. LLM must never have unrestricted authority over financial operations (never invent transactions, never silently mutate records, confirmation required for consequential actions).
- Currency: INR (₹), India conventions; tiffin/meal tracking is a first-class feature
- The 5 product pillars: expense tracking, financial memory, budget monitoring, recurring/consumption tracking, daily/monthly/yearly reports

## Decisions (append-only)
- 2026-11-03: **Visual direction committed — "Quiet Ledger"** (pre-build design exploration, `docs/design-direction.md`). One-line opinion: "A calm print-ledger that talks back — looks like a well-set account book, not a dashboard; the honesty layer (pencil draft → stamped confirm → audit) is the visual signature." Type: Fraunces + IBM Plex Sans/Mono; semantic color only (confirmed green / over red / estimate pencil); asymmetric chat+rail; no charting lib; no dark mode in MVP; stamp settle = the single signature motion.
- 2026-11-03: Stack = Next.js + Supabase. Rationale: best fit for SaaS-shaped demo with minimal infra; user-approved at kickoff.
- 2026-11-03: Agentic approach = tool-calling LLM with whitelisted tool schema. Rationale: strongest honest "agentic OS" narrative + real capability; deterministic money math stays out of the LLM.
- 2026-11-03: Solo sequential build. Rationale: user preference; lower merge risk, tighter control.
- 2026-11-03: Full win package targeted. Rationale: user wants deck + video + live URL.
- 2026-11-03: INR / India conventions. Rationale: matches concept doc (tiffin, UPI, ₹ figures).
- 2026-11-03: **Wedge chosen: F — Memory-first capture** (Phase 2, unanimous scoring 24/25). Pillar order: ① NL capture + instant budget context (headphone moment) ② financial memory (decisions/commitments) ③ tiffin meter (consumed/skipped/cancelled + payable) ④ daily/monthly reports ⑤ year trends if time. Each slice independently demoable. Rationale: research verified all three gaps (NL capture in India, transactions-only competitors, consumption chaos) map to slices ①–③; the headphone moment demos memory + honest-agent in one exchange.

## Artifacts
- Research brief: docs/research-brief.md (DONE, PASS WITH NOTES)
- Research provenance: docs/research-brief.provenance.md (DONE)
- Plan: docs/plan.md (DONE — SIGNED 2026-11-03, see §10)
- Design direction: docs/design-direction.md (DONE — "Quiet Ledger", committed)
- Deck: (pending)
- Demo video: (pending)
- README status: 0% complete

## Completed phases
- [x] kickoff
- [x] research
- [x] ideation
- [x] blueprint
- [ ] build
- [ ] harden
- [ ] deploy
- [ ] win-package
