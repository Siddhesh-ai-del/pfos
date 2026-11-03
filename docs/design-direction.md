# PFOS — Design Direction & System (pre-build exploration)

**Status:** PROPOSAL — awaiting approval alongside plan §10
**Skills used in this exploration:** `frontend-design-direction` (direction contract) · hackathon-mode `references/design.md` (anti-slop checklist) · `make-interfaces-feel-better` (craft details) · `design-system` (token methodology) · `frontend-a11y` (accessibility patterns) · `frontend-patterns` / `motion-*` (reserved for Phase 4 build) · `apple-design` **considered, not loaded** — it targets native iOS/macOS/Flutter apps, this product is web.
**Rule:** no interface gets built until the direction below is approved. Naming, tokens, and component vocabulary here are canonical for all Phase 4 code.

---

## 1. UX question analysis (before any aesthetics)

| # | Question | Answer that drives design |
|---|---|---|
| Q1 | Record an expense in <5s? | **Chat composer is the primary, always-available surface** — not a form, not a modal, not a FAB. On desktop it is focused on load; on mobile it is a persistent bottom bar. One sentence + Enter. Zero taps to reach the composer. Draft card appears in-line; Confirm is one click on the card itself. |
| Q2 | Financial state understandable at a glance? | The context rail keeps **one card per money surface, one decisive number per card** (₹ remaining / ₹ over / ₹ payable). Under the number, a hairline proportion bar (spend vs budget). No dashboards of 12 same-sized cards; hierarchy leads the eye to the *decisive* figure. |
| Q3 | Assistant integration? | The assistant is **the room, not the guest**: chat occupies the primary column, permanently. No floating bubble (that's where assistants go to feel bolted-on). Drafts, reports, and memory events are *cards inside the chat stream*, each referencing its rail card so the user sees the LLM is not narrating from imagination. |
| Q4 | Effortless consumption tracking? | The rail tiffin card shows today's meals as status chips (B·L·D). One tap on a chip toggles status inline; or say "had lunch at the mess". Never silently assumed — unknown states ask. |
| Q5 | Review & correct history? | The ledger is a ruled table (not virtualized cards): amounts in tabular numerals, row-level edit, and every correction renders with a byline ("edited Nov 3, was ₹1,500"). "Pending estimates" live at top until confirmed — trust requires *seeing* the un-confirmed. |
| Q6 | Budget warnings without annoyance? | Warnings live in exactly two places: the budget card (turns red, ink does not blink) and one context line at capture time. **No banners, no badges, no dopamine-red pulsing.** A judgment-free tone is a design constraint (CHI 2016 guilt finding) — visual calm is part of the ethics. |
| Q7 | Daily/monthly/yearly reports? | Daily = a card in chat. Monthly = the rail expands into a **"statement" spread** — ledger-column layout, category rows with proportion bars, previous-month comparison line. Yearly = compressed 12-row bar list (stretch slice). Never a wall of pie charts. |
| Q8 | Build trust? | Trust is a *visual system*, not a trust badge: every draft is visibly "ESTIMATED" (dashed, pencil-toned) until "CONFIRMED" (stamped, solid). Every card carries a discreet "≡ audit" toggle showing the exact whitelisted tool call + RPC result that produced its numbers. The honesty architecture is on the page, in the open. |
| Q9 | Desktop vs mobile? | Desktop: asymmetric two-column (chat ≈ 3fr | rail ≈ 2fr). Mobile: rail collapses into a horizontally swipeable card strip above the chat; composer docks bottom; golden flow verified at 375px **per slice, not at the end** (pipeline rule). |

---

## 2. Interface philosophies explored (5 concepts, scored)

Scored 1–10 on the user's criteria. **Daily-frequency suitability** and **cognitive load** are weighted ×2 (a money log is a lifetime product, not a landing page).

| Criterion | **C1 Quiet Ledger** | C2 Operator Console | C3 Bento Glanceboard | C4 Editorial Moneyjournal | C5 Modern Native Shell |
|---|---|---|---|---|---|
| Ease of use | 9 | 6 | 7 | 7 | 8 |
| Cognitive load | 9 | 7 | 6 | 7 | 7 |
| Visual hierarchy | 9 | 7 | 5 | 8 | 7 |
| Information density | 8 | 9 | 7 | 7 | 7 |
| Accessibility | 9 | 6 (dark-low-contrast risks) | 7 | 7 | 7 |
| Responsiveness | 9 | 8 | 6 | 6 | 8 |
| Consistency | 9 | 7 | 7 | 8 | 6 |
| Scalability (SaaS later) | 9 | 7 | 7 | 7 | 7 |
| Daily-frequency suitability ×2 | 18 | 12 | 10 | 12 | 14 |
| **Weighted total** | **89 ⭐** | 77 | 71 | 80 | 81 |
| Distinctiveness / anti-slop | High (unusual for finance) | High (but reads dev-tool) | **LOW** (2024 template) | Medium-high | LOW ("another expense app") |
| Assistant fit | Native (it's the room) | Native | Forced (tile-ized) | Subordinate | Bolted-on risk |
| Trust aesthetic | Excellent (stamp vs pencil) | Medium | Weak | Good | Weak |

### Concept briefs

- **C1 — Quiet Ledger** *(Swiss-grid accounting, warm paper, stamp/pencil trust metaphors).* The product is a *record*; the UI behaves like a well-set account book that talks back. Asymmetric chat+rail; ruled hairline rows; tabular numerals everywhere; one semantic accent; estimated = dashed pencil, confirmed = stamp. Fits: reliability-first philosophy (§6 of concept doc), daily use, judge-scan readability, anti-slop by design.
- **C2 — Operator Console** *(terminal dark, mono, keyboard-first).* Gorgeous for engineers, alienating for a normal Indian consumer; low-contrast dark themes fight accessibility; judges may read "devtoy".
- **C3 — Bento Glanceboard** *(tiles of varying size).* Glanceable, but the chat—the product's soul—becomes a tile among tiles; bento is also the most recognizable current template aesthetic (slop risk).
- **C4 — Editorial Moneyjournal** *(each day = a magazine page).* Beautiful monthly reports, but recording (the 5-second job) loses primacy and mobile reading-comps force the chat below-the-fold.
- **C5 — Modern Native Shell** *(iOS-like cards, springy sheens, bubble chat)*. Familiar = the problem: it looks like Cleo/Walnut's successor, exactly what the user said not to be; conversational ChatGPT-cloneities (bubble + big rounded cards) read generic.

**Decision: C1 — Quiet Ledger**, absorbing the *narrative-report strength* of C4 (the monthly "statement spread") because editorial layout is at its best inside reports, where it serves the deterministic-math story.

---

## 3. The committed direction

**One-line visual opinion:** *"A calm print-ledger that talks back — looks like a well-set account book, not a dashboard; the honesty layer (pencil draft → stamped confirm → audit) is the visual signature."*

**Memorable detail** (the one intentional thing): the **stamp/pencil trust pair** — drafts render with a dashed pencil-toned border and an "Estimated" tag; confirming applies a slight `scale(0.96→1)` settle + a solid border and a "Confirmed HH:MM" byline, like an ink stamp. Animation budget spent entirely here (single signature transition; `prefers-reduced-motion` honored).

---

## 4. Design system (tokens; canonical)

### 4.1 Typography
| Role | Face | Notes |
|---|---|---|
| Display / money figures | **Fraunces** (SemiBold 600, optical sizing) | distinctive, warm, ledger-grade; loaded via `next/font`, `display: swap` |
| Body / UI | **IBM Plex Sans** (400/500) | neutral, tabular-nums support |
| Labels / stamps / tool-chips | **IBM Plex Mono** (500, uppercase, letterspaced) | the "bookkeeping mark" voice |
| Money everywhere | `font-variant-numeric: tabular-nums` (utility class `num`) **mandatory** — digits never jiggle |
| Scale | 32/24/18/15/13/11 px roles — visible hierarchy, no default sizes |

### 4.2 Color
| Token | Value | Use |
|---|---|---|
| `--paper` | `#FBF9F4` | app background (warm, not clinical white) |
| `--ink` | `#191713` | primary text |
| `--ink-2` | `#6B655B` | secondary text |
| `--rule` | `#E5E1D8` | hairline borders/row rules |
| `--confirmed` | `#1B6E45` | semantic green — confirmation & remaining-budget states ONLY |
| `--over` | `#B3402E` | over-budget / cancel semantic ONLY (does not pulse) |
| `--estimate` | `#8A7A55` | pencil tone for estimated/dashed states |
| `--card` | `#FFFFFF` | card surfaces (flat, hairline border, no drop-shadow inflation) |
| Dark mode | **out of MVP** (consistency > optionality); revisit post-demo |

Restraint rule: color is *semantic* (green/red/pencil), never decorative. No gradients, no glass, no glow (anti-slop hard rules).

### 4.3 Space & grid
- Base unit 4px; spacing rhythm 4/8/12/16/24/32.
- Desktop: 12-col grid, chat 3fr | rail 2fr, gutter 24px; cards aligned to a shared left edge (asymmetric, not centered marketing).
- Mobile (375px): single column; rail = horizontal card strip (snap scroll); composer sticky bottom (safe-area aware).
- Radii: concentric per `make-interfaces-feel-better` — card r=10, chip r=5 (parent = child + padding math); buttons r=6.

### 4.4 Component hierarchy
`ChatBubble (lead/rest) → DraftCard (expense | meal) → ConfirmBar → BudgetCard / TiffinCard / MemoryCard / MonthGlanceCard (rail) → LedgerTable row → ReportCard (daily | monthly spread) → AuditDrawer (per-card tool-call + RPC reveal) → Chip (status) → Reset button (top bar)`. Nothing more. 5 shadcn primitives max (Card, Button, Badge, Input, ScrollArea) per plan §6.

### 4.5 Icons / charts / tables
- Icons: **lucide**, 1.25px stroke, ink color, only where semantic (confirm ✓, audit ≡, reset ↺). No emoji in UI chrome.
- Charts: **no charting library** — hairline proportion bars (`div` widths) inside cards; category rows with `₹` right-aligned tabular figures.
- Tables: ruled rows, right-aligned money, secondary text `--ink-2`.

### 4.6 States (real products have six, slop has one)
| State | Treatment |
|---|---|
| Loading | skeleton *rows* (matching ruled-row height), never spinners on cards |
| Empty (tiffin no meals) | ledger voice: "No meals logged today. Say 'had lunch'." |
| Empty (month) | "November starts empty. Type an expense to begin." |
| Error (chat/tool fail) | inline, quiet: "I couldn't reach the ledger. Try again." + retry chip |
| Over-budget | `--over` text + solid border; **no animation on warnings** |
| Estimated vs confirmed | dashed `--estimate` border + "Estimated" tag ↔ solid + confirmation byline |

### 4.7 Accessibility (from `frontend-a11y`)
- Chat composer: real `<textarea>` w/ visible label (`aria-label="Expense or question"`); confirmation always announced via `role="status" aria-live="polite"` (chat stream), draft confirm result via `role="alert"`.
- Rail cards: `<section aria-labelledby>` each; status chips are real `<button>`s with `aria-pressed`; meal chips labels "Breakfast consumed" not just "B".
- Contrast: `--ink` on `--paper` = 15.9:1; `--ink-2` = 6.3:1 (AA at 13px+); `--confirmed` on paper = 6.1:1; verified during build slices.
- Focus: visible 2px `--ink` focus rings on light surfaces; keyboard-only golden walkthrough in Phase 5; hit areas ≥ 44px (composer chip targets, confirm buttons); `prefers-reduced-motion` kills the stamp transition.
- Reset button: `aria-label="Reset demo data"` (icon + text, not icon-only).

### 4.8 Motion budget (max 1 signature transition)
**The stamp settle** on confirm: 180ms, `transform scale(0.96→1) + border-color + tag cross-fade`, `ease-out`, disabled under reduced-motion. Everything else: explicit `transition-property` (no `transition: all`), ≤ 150ms, per `make-interfaces-feel-better`.

### 4.9 Naming & voice
Product voice = a precise ledger, not a motivational coach: numbers stated plainly, zero judgment ("that puts Discretionary ₹2,500 over — record as a planned purchase?"). Copy micro-vocabulary: "ledger" not "transactions feed"; "estimate" not "pending AI suggestion"; "confirm" not "approve with AI".

---

## 5. How this serves the judging axes
- **Design/UX:** anti-slop by construction (asymmetric, ruled, semantic-color, no template bento/heroes).
- **Execution:** the trust pair + audit drawer *shows* the honest-agent story on the page — judges see the machine underneath.
- **Wow moment upgrade:** Beat 3 doesn't just flip a budget card; the draft turns from pencil to stamp in one motion. Reheasable, 1-repetition wow.
- **375px:** verified per pipeline rule in every build slice.
