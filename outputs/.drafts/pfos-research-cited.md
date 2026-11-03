# PFOS Research Synthesis — cited draft (slug: pfos-research)

Compiled 2026-11-03 from three parallel tracks (T1 competitors · T2 agentic patterns · T3 behavior evidence). Full source notes: `outputs/.drafts/pfos-research-{competitors,agentic,behavior}.md`. Direct-mode citation pass by lead; load-bearing claims spot-verified via webfetch 2026-11-03.

## Executive summary

PFOS targets a verified triple gap: (1) people abandon manual expense tracking because collecting data costs effort and spawns guilt; (2) India's dominant auto-capture play collapsed and bank-sync aggregators don't fit how Indians spend (cash ~60% of expenditure, UPI micro-ticket flood); (3) every existing product stores transactions only — no one models financial *memory* (decisions, commitments, metered consumption). An LLM agent with a whitelisted tool schema, draft-then-confirm writes, and deterministic Postgres math can occupy this whitespace honestly: the "agentic" layer is real, demobable, and architecturally proven by production precedents (Stripe MCP, OpenAI HITL, Revolut AIR).

## Finding 1 — The problem is real, evidenced, and India-critical

- CHI 2016 (Epstein et al., 193 ex-trackers surveyed, 12 interviewed): top quit reason = **cost of collecting and integrating** data; finance-specific pain = **discomfort with what the data reveals** — "I felt guilty every time I tracked an expense that was not a necessity" (p163); "Abandoning tracking may be the easiest way to address this discomfort." (verified: https://pmc.ncbi.nlm.nih.gov/articles/PMC5428074)
- U.S. BLS Consumer Expenditure Survey feasibility study (96 apps, real participants): dominant complaint = **forgetting to open the app and log**; participants praised **voice recognition** as easier than typing. (https://www.bls.gov/cex/research_papers/pdf/evaluation-of-financial-application-software-report.pdf)
- Provenance caveat (carried forward): the popular "85% abandon" stat exists only in vendor blogs — **do not cite it**. The citation-backed proxy: RevenueCat 2024 — ~1.7% of paid-subscription-app downloads convert within 30 days (https://www.revenuecat.com/pdf/state-of-subscription-apps-2024.pdf); 2026 report: AI apps earn 41% more revenue but churn 30% faster (https://www.revenuecat.com/state-of-subscription-apps). **Implication for PFOS: an AI-first money app must beat a documented churn headwind via judgment-free framing + lapse tolerance.**
- India: cash ≈ 60% of consumer expenditure as of Mar 2024 (RBI, https://www.business-standard.com/finance/news/digital-payments-double-in-3-years-cash-transactions-fall-rbi-report-124102300571_1.html); UPI at record 21.63B txns in Dec 2025 with shrinking ticket sizes (https://www.thehindubusinessline.com/economy/upi-volumes-rise-to-record-2163-billion-in-dec-around-300-lakh-crore-of-upi-transactions-made-in-cy2025/article70460654.ece). Walnut pivoted into axio's lending funnel with degraded Play reviews; Google tightened SMS permissions. **Neither aggregators nor manual forms cover how Indians actually spend; tiffin lives exactly in the cash + low-value + informal-merchant zone.**
- Product hypothesis, not pinned evidence: tiffin-style metered consumption fails to get tracked today — flagged as such everywhere.

## Finding 2 — Competitive darkness + verified whitespace

Global aggregators (Copilot $13/mo, Monarch, YNAB $14.99/mo, Rocket Money, Emma) are all **bank-sync, USD, transactions-only**. India options are bank-bound (Fi, Jupiter, ET Money) or manual-only (Money Manager) or pivoted (axio), all **transactions-only**. The sole LLM-native consumer finance product, **Cleo, is US-only**. Tiffin "N of M meals" consumption exists **only in B2B mess software** (MessMitra) and habit counters disconnected from money.

**Gap table (verified failures):**

| Gap | Who fails it | PFOS answer |
|---|---|---|
| NL capture in India | Copilot/Monarch/YNAB (US-bank sync), axio (SMS-only, degrading), Money Manager (forms) | type/say "spent ₹240 auto to office" → structured entry |
| Memory beyond transactions | every confirmed product (transactions + at best goals) | decisions + commitments + consumption as first-class record types |
| Metered consumption fused to money | nobody consumer-side | "33 of 45 prepaid meals consumed, ₹X outside plan" |
| Agentic assistant in India | Cleo (US-only), Magnifi (investing) | grounded context reports, nudges, reminders |
| Survivor risk + privacy | Mint dead 2024; axio-lending; Fi/Jupiter self-lock-in | manual-first, no bank creds needed, portable memory |

## Finding 3 — The agentic architecture is honest and proven

T2 sources verified: OpenAI Agents SDK HITL flow — tool declares `needs_approval`, run **pauses**, user approves/rejects server-side, rejections feed back a message; stable idempotency keys across retries. (https://openai.github.io/openai-agents-python/human_in_the_loop/ — verified live 2026-11-03). Stripe MCP exposes separated `stripe_api_read`/`stripe_api_write` tools with **"Human confirmation"** badges on consequential money actions (https://docs.stripe.com/mcp — verified live). Anthropic: the model never executes — it emits structured requests, the app executes (https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works); consolidate tools, namespace them (https://www.anthropic.com/engineering/writing-tools-for-agents). Finance-ops warning: LLMs "not safe to use unsupervised for anything that must reproduce exactly, such as posting journal entries or approving payments" (https://loopfour.ai/blog/llms-in-finance).

**PFOS pattern stack (R1–R6, all cheap in Next.js + Supabase):**
1. **Strict-schema tool whitelist** (~5-10 tools, namespaced) — model emits calls only, server executor validates + runs.
2. **Draft-then-confirm gate** — every write lands as `status: 'estimated'`; promotion to `confirmed` requires explicit user action; `confirmations` audit table. *"Estimated vs confirmed" is PFOS's own synthesis — no single source uses that phrase.*
3. **Zero money math in the LLM** — all sums/totals/thresholds in Postgres RPC functions.
4. **Consolidated high-signal read tools** — pre-aggregated context, not raw dumps (token + reliability win).
5. **Two-layer memory** — chat thread + `financial_memory` table (preference/decision/commitment, confidence-scored, async-extracted).
6. **Audit + idempotency on every consequential write.**

**Positioning wedge** [inference]: no dominant product or well-known webpage occupies "financial memory" as a product phrase — agent-memory taxonomy (semantic/episodic/procedural) exists in engineering write-ups only (https://www.philschmid.de/memory-in-agents). Real-world precedent set: Stripe/Plaid/Era MCP servers, Revolut AIR biometric gates.

## Open questions / carried caveats

- Vendor pricing facts unverified for Monarch/Rocket Money/Emma — verify before quoting on a deck slide.
- Axio degradation sourced from a single 2026 Play review — treat as signal, not proof; phrase as "user reviews report…" if cited.
- No public write-up covers WhatsApp-style Indian agentic capture — possible prior-art check before Phase 3.
- Tiffin-tracking failure is a product hypothesis; never present it as sourced data.

## Winning angles for Phase 2 (each tied to a judging axis)

1. **"Your finances, remembered"** — financial memory (transactions + decisions + commitments + consumption) as the entity model. *Judging fit: Innovation + Impact; demo: ask "why did I buy those headphones in June?" and get the answer.*
2. **Honest agent, strict gates** — whitelisted tools + draft-then-confirm + deterministic math; show a hallucination attempt being caught by the tool layer. *Judging fit: Technical depth; wow: "trust me, I'm auditable".*
3. **Zero-friction India capture** — one-line NL entries incl. tiffin counts, ₹-native, no bank creds. *Judging fit: Impact + execution; wow: the headphone-budget dialogue from the concept doc, live.*
