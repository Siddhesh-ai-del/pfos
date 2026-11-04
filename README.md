# PFOS

**A persistent financial operating system: you say what happened to your money in one sentence, and it records it, remembers why, and answers honestly.**

[![License: Apache-2.0](https://img.shields.io/badge/LICENSE-Apache--2.0-0F172A?style=for-the-badge&labelColor=0F172A&color=0F172A&logo=apache&logoColor=white)](#license)
[![Status: pre-release](https://img.shields.io/badge/STATUS-pre--release-0F172A?style=for-the-badge&labelColor=0F172A&color=0F172A)](#project-status)
[![Stack: Next.js](https://img.shields.io/badge/STACK-Next.js-0F172A?style=for-the-badge&labelColor=0F172A&color=0F172A&logo=nextdotjs&logoColor=white)](#architecture)
[![Stack: Supabase](https://img.shields.io/badge/STACK-Supabase-0F172A?style=for-the-badge&labelColor=0F172A&color=0F172A&logo=supabase&logoColor=white)](#architecture)
[![Language: TypeScript](https://img.shields.io/badge/LANGUAGE-TypeScript-0F172A?style=for-the-badge&labelColor=0F172A&color=0F172A&logo=typescript&logoColor=white)](#architecture)

## Overview

PFOS is a personal finance application for Indian users built around a
conversational ledger. You record an expense in plain language, the system
turns it into a structured draft you confirm before anything is saved, and
every number it ever shows you comes verbatim from the database — never from
a language model's imagination.

| Principle | What it means |
| --- | --- |
| Honest agent | Every amount comes verbatim from a Postgres RPC. The LLM never computes money math. |
| Draft-then-confirm | Nothing is saved until you explicitly confirm. Estimates are visibly drafts, never pre-confirmed. |
| Deterministic ledger | Budgets, category totals, and tiffin billing live in SQL functions with their own audit trail. |
| India-native | INR with Indian digit grouping, and tiffin (mess) billing cycles as a first-class feature. |

## Why PFOS

Manual expense tracking fails by design, not by laziness. A CHI 2016 study of
193 former self-trackers found the top quit reason is the cost of collecting
data, compounded by a finance-specific pain: discomfort with what the data
reveals — "I felt guilty every time I tracked an expense that was not a
necessity." A U.S. BLS feasibility study across 96 apps confirms "forgettable
to log" is the dominant complaint.

The capture landscape in India has thinned out at the same time. The
low-friction SMS trackers users loved were absorbed or discontinued; global
aggregators are USD and US-bank-centric; and cash still covers roughly 60% of
consumer expenditure while UPI micro-transactions surge — so low-value daily
spend (tiffin, auto, chai) falls through every existing capture net.

PFOS attacks that gap: recording is a single sentence, warnings are
judgment-free, and the assistant's honesty is visible in the interface — each
answer carries the tool call and database result behind it, so trust comes
from transparency rather than branding.

The full evidence trail, with verified sources, lives in
[docs/research-brief.md](docs/research-brief.md).

## Planned capabilities

> None of these are shipped yet. See [Project status](#project-status) and
> [docs/BUILD-STATE.md](docs/BUILD-STATE.md) for exactly what exists today.

- **Capture in under five seconds** — type one sentence, confirm the draft; no forms, no modals
- **Budget overflow dialogue** — when a discretionary purchase overshoots half the remaining budget, the assistant surfaces the context and asks intent instead of silently logging
- **Financial memory** — decisions and commitments are first-class, queryable records ("why did I buy those headphones?" is answerable from data, not vibes)
- **Tiffin meter** — consumed / skipped / cancelled meal statuses with prepaid-cycle billing math and a payable invariant enforced in SQL
- **Daily, monthly, and yearly reports** — deterministic category tables with previous-month comparison and recurring-spend candidates
- **SaaS-ready path** — per-user row-level security and auth swap documented for multi-tenant operation

## Project status

PFOS is in active pre-release development. There are no releases, no public
deployment, and no installable artifact yet. The foundation (schema, seeded
demo state, demo reset, context rail) and the agent backbone (whitelisted
tool-calling weave loop, executor, audit logging, chat interface) are
implemented and covered by an automated test suite locally.

### Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| Foundation | Ledger schema, Postgres RPCs, seeded demo state, demo reset, context rail | In progress |
| Agent backbone | Whitelisted tool schema, weave loop, executor, audit logging, chat pane | In progress |
| Capture | Draft-then-confirm expense logging with live budget refresh, budget-overflow dialogue | In progress |
| Memory | Decisions and commitments with linked transactions | In progress |
| Tiffin meter | Meal consumption statuses and cycle payable math | In progress |
| Reports | Deterministic daily and monthly report cards | In progress |
| Hardening | E2E golden replay, idempotency audit, accessibility pass | Planned |
| Public deployment | Hosted demo with seeded state and reset | Planned |

## Installation

Not yet available. PFOS has no packaged releases; when the first public build
ships, this section will hold setup instructions. Until then, the roadmap
above is the source of truth for where the project stands.

## Architecture

The intended structure is a single-page Next.js application with two surfaces:
a conversation pane where captures happen, and a context rail rendering one
decisive number per money surface (budgets, tiffin, memory, month glance).
All money arithmetic lives in Postgres RPCs; the language model is restricted
to a hard-coded, versioned whitelist of tools whose arguments are validated
with strict schemas before any database call runs; every tool invocation is
written to an audit log with an idempotency key so replays collapse rather
than duplicate.

## Repository layout

```
pfos/
├── app/          # Next.js App Router pages and API routes
├── components/   # UI components (chat pane, context rail, top bar)
├── lib/          # demo constants, Supabase client, agent tool whitelist and weave loop
├── supabase/     # schema migrations: ledger tables, RPCs, demo seed and reset
├── tests/        # vitest suites: tool schemas, seed contract, weave and executor
├── docs/         # blueprint, design direction, research brief, build state
└── .github/      # contribution, security, issue and PR templates
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports and feature ideas are
welcome through the issue templates.

## Security

See [SECURITY.md](SECURITY.md). Please report vulnerabilities privately
through GitHub security advisories.

## Support

See [SUPPORT.md](SUPPORT.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
