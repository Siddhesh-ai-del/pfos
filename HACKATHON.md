# HACKATHON STATE — Personal Financial Operating System (PFOS)

Status: phase-4 | build in progress (Slice 1)
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
- [ ] ideation
- [x] blueprint
- [ ] build
- [ ] build
- [ ] harden
- [ ] deploy
- [ ] win-package
