# Deep Research Plan — PFOS (Personal Financial Operating System)

Slug: `pfos-research`

## Key Questions

1. **Problem evidence** — Is manual expense forgetting / poor budget adherence a documented, real problem? (habit research + Indian consumer finance context)
2. **Competitors & prior solutions** — What exists in 2025–2026: global aggregators (Mint→Credit Karma, Copilot Money, YNAB, Monarch), Indian players (Walnut, Money Manager, Spendee, Fi Money, Jupiter, CRED, Jar), and LLM-native finance agents (existing agentic money assistants, demo/game products)? What are the gaps for: NL capture, financial *memory* (decisions, commitments), consumption/tiffin tracking, deterministic money math, assistant context?
3. **Agentic-pattern landscape** — How are LLM tool-calling finance agents built (deterministic tool layer vs pure generation)? What trust/safety patterns make money apps credible (confirmation gates, never-invent-transactions, audit logs)?
4. **Winning angles** — Which 2–3 differentiated angles could win: (a) "financial memory" as an entity model (transactions vs decisions vs commitments vs consumption), (b) NL-first zero-friction capture with whitelist tools, (c) India-first no-aggregator-needed (manual + tiffin-mode) approach?

## Evidence Needed

- Competitor matrices: capture method, memory model, budgeting, India fit, agentic behavior
- Evidence that expense-log abandonment is common (habit-formation / quantified-self attrition studies)
- Tool-calling agent architecture references (OpenAI/Anthropic function-calling docs, finance-agent write-ups)
- Judging-fit mapping: impact, technical depth, demo-ability, wow factor

## Scale Decision

Broad multi-faceted topic (competitive landscape + behavior evidence + agent patterns) → **3 parallel `general` subagents** (hackathon-capped, each ≤ ~6 searches, abstracts/docs preferred over deep reads).

- T1: Global + Indian expense-tracker competitor landscape and gaps
- T2: LLM-native finance agents + tool-calling architecture patterns + trust/safety in money apps
- T3: Behavioral evidence: why expense tracking fails, friction research, quantified-self attrition

## Task Ledger

| ID | Owner | Task | Output | Status |
|----|-------|------|--------|--------|
| T0 | lead | Write this plan | outputs/.plans/pfos-research.md + 3 T-briefs | done |
| T1 | general | Competitor landscape | outputs/.drafts/pfos-research-competitors.md | done |
| T2 | general | Agentic finance patterns | outputs/.drafts/pfos-research-agentic.md | done |
| T3 | general | Behavior friction evidence | outputs/.drafts/pfos-research-behavior.md | done |
| T4 | lead | Synthesize draft | (merged into cited pass) outputs/.drafts/pfos-research-cited.md | done |
| T5 | lead | Cite + verify (direct mode, no verifier agent) | outputs/.drafts/pfos-research-cited.md + verification | done |
| T6 | lead | Self-review | outputs/.drafts/pfos-research-verification.md (PASS WITH NOTES) | done |
| T7 | lead | Deliver 1-page brief | docs/research-brief.md + docs/research-brief.provenance.md | done |

## Verification Log

- Direct-search citation mode (no verifier/reviewer subagents, per deepresearch rules for direct runs)
- Every URL spot-checked with webfetch before citing
- Final: PASS / PASS WITH NOTES / BLOCKED recorded in provenance file

## Decision Log

- 2026-11-03 (lead): Adapted deepresearch artifact paths to project root outputs/ under /home/siddhesh/pfos — final deliverable per hackathon pipeline is docs/research-brief.md, provenance sidecar next to it.
- 2026-11-03 (lead): 3 subagents, not more — hackathon budget cap.
