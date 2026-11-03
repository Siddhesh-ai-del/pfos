# PFOS Research — Competitor landscape: personal expense-tracking / budgeting apps (T1)

Date compiled: 2026-11-03 · Method: ≤8 web searches + official product pages (Play Store, ynab.com, webfetch). Every claim carries a URL. Anything not confirmed by a captured source is marked **unverified**.

---

## 1. Global aggregators

| App | Status | Capture method | Memory model | Budget monitoring | Reports | India fit (UPI / ₹ / consumption) | Assistant / agentic | Pricing |
|---|---|---|---|---|---|---|---|---|
| **Mint (Intuit)** | **Dead** — shut down 23 Mar 2024; users forced to Credit Karma, which lacked budgeting features | Bank sync (historical) | Transactions only | Had budgets; Credit Karma migration lost most of them | Yes (historical) | None | None | N/A |
| **Copilot Money** | Active, premium | Bank sync | Transactions only | Category budgets with progress tracking | Yes | None (US-centric, USD) | Limited (insights, not conversational) | **$13/mo**, no free tier |
| **Monarch Money** | Active, premium | Bank sync | Transactions only | Category budgets; strong partner/collaborative budgeting | Yes | None (US) | Limited | Subscription (~$100/yr tier) **unverified exact price** |
| **YNAB** | Active | Bank sync via **Plaid** (US/UK/EU/AU regulated partners) + manual entry | Transactions + planned allocations ("give every dollar a job"); goals | Core product is zero-based envelope budgeting | Yes | No UPI; USD pricing; manual entry works but no SMS/UPI capture | None (philosophy is user-driven planning) | **$14.99/mo or $109/yr**, 34-day free trial (official site structured data) |
| **Rocket Money** | Active | Bank sync | Transactions only | Spend tracking + budgets | Basic | None (US) | Partial — automated **subscription cancellation & bill negotiation** services | Tiered subscription **unverified** |
| **Wallet by BudgetBakers** | Active (assumed) | Bank sync (assumed) | unverified | unverified | unverified | None known | unverified | Freemium **unverified** |
| **Spendee** | Positioning unclear post-2023 acquisitions | Bank sync (assumed) | unverified | Shared wallets/budgets **unverified** | unverified | None known | None | Freemium **unverified** |
| **Emma** | Active | Bank sync | Transactions only | Budgets + subscription detection | Basic | None (US/UK) | Limited "Emma AI" **unverified** | Freemium + paid tiers **unverified** |

Sources: Mint shutdown (https://plisio.net/tradfi/mint-vs-credit-karma ; https://orbitmoney.io/blog/what-happened-to-mint ; https://community.tiller.com/t/mint-is-shutting-down-faq-timeline-and-alternatives/20221) · Copilot vs Monarch pricing/features (https://getfinny.app/blog/copilot-money-vs-monarch-money-2026 ; https://monavio.app/blog/monarch-money-vs-copilot-money/ ; https://www.auritrack.com/compare/copilot-money-vs-monarch) · YNAB official (https://www.ynab.com — pricing $14.99/mo, $109/yr, 34-day trial from page's SoftwareApplication schema; Plaid as account-info agent per page footer) · Rocket Money vs YNAB (https://www.rocketmoney.com/learn/personal-finance/rocket-money-vs-ynab) · general comparison incl. Era (https://era.app/articles/era-vs-monarch-vs-copilot-vs-ynab/)

**Takeaway:** every surviving Western aggregator is bank-sync-first, subscription-priced in USD, and stores **transactions only**. None model decisions, commitments, or metered consumption.

---

## 2. India-specific players

| App | Status | Capture method | Memory model | Budget monitoring | Reports | India fit | Assistant / agentic | Pricing |
|---|---|---|---|---|---|---|---|---|
| **Walnut → axio** | Walnut brand retired; now **axio** (formerly Capital Float, Walnut & Walnut 369), brand of CapFloat Financial Services (RBI-registered NBFC). 10M+ downloads, 4.5★/266K reviews. | **SMS-based** on-device parsing of bank/merchant transaction messages; also manual tagging, notes, custom categories, receipt photos | Transactions only (spend, balances, bills) | Daily/monthly spend tracking + bill reminders | Breakdown + **export** (a user review, Jul 2026, says export is broken — quality-degradation risk) | Strong: ₹, bank SMS/UPI ecosystem, Android-only widely used | None — positioning has shifted to credit (Pay Later EMIs, personal loans at 14–35% p.a., fixed deposits) | Free tracker bundled with lending funnel |
| **Money Manager (Realbyte)** | Active | **Manual form entry** (primary); bookkeeping-style ledger | Transactions only | Expense & budget by category | Daily/weekly/monthly reports | ₹ supported; no SMS/UPI auto-capture | None | Free w/ ads + paid tiers |
| **ET Money** | Active | Direct bank sync + investment tracking | Transactions + investments/mutual funds | Expense + wealth management view | Investment-centric reports | ₹, Indian banks; SEBI-registered advisery arm | None (wealth advisery flavor) | Free + paid tiers (exact name **unverified**) |
| **Fi Money** | Neo-bank with **native** bank integration (expense insights only inside Fi's own account) — iOS users report no SMS-style auto-tracking outside Fi | Transactions only | Basic | Basic | Bank-own-account only; can't be used as an independent tracker | None | Free (with banking relationship) |
| **Jupiter** | Active | Own neo-bank accounts + connected bank accounts/cards | Transactions only | "Money Manager": budgets + net worth across connected accounts, auto-categorisation | Yes | ₹, Indian banks, neo-bank umbrella | Insights only | Free w/ banking |
| **CRED** | Very active (assumed) | Unclear — mortgages/pays/credit-card bills **unverified** | unverified | unverified | unverified | Strong India footprint for cards/UPI **unverified** | unverified | Unverified details in this draft |
| **Jar** | Round-up micro-savings into gold **unverified** — no source captured in this round | — | — | — | — | — | — | — |
| **Emerging manual trackers (Spentt, Dailychalan, FinTra, TrackMyRupee, Lekhhaa)** | Small/local, positioning around post-Walnut gap and "no bank linking" privacy | Manual + some Splitwise-style group spends (Lekhhaa covers tiffin/dabba bills as a shared-expense *category*) | Transactions only | Basic budgets | Basic | ₹-native | None | Mostly free |
| **Splitwise-style (Lekhhaa)** | Active | Manual group expense entry | Transactions + shared splits | No real budgets | Group summaries | ₹, tiffin/dabba listed as a category (not metered consumption) | None | Free |

Sources: axio official Play Store listing — "SMS-based money management… tracking expenses automatically… axio (formerly known as Capital Float, Walnut & Walnut 369) is the brand name of CapFloat Financial Services… Pay Later… 14%–35% p.a.…" (https://play.google.com/store/apps/details?id=com.daamitt.walnut.app&hl=en_US ; also https://play.google.com/store/apps/details?id=com.daamitt.walnut.app&hl=en_NZ) · Walnut/Axio rebrand coverage (https://themoneydecoded.com/blog/best-expense-tracking-apps ; https://trackmyrupee.com/blog/trackmyrupee-vs-walnut-axio-vs-money-manager-which-expense-tracker-is-best-for-indians-in-2026/ ; https://fintrahq.com/compare/walnut-expense-tracker-alternative/ ; https://finart.app/best-expense-tracker-apps-india/) · "Walnut shut down in 2023" framing (https://www.spentt.live/blog/best-free-expense-tracker-india.html) · axio 10M users (https://www.hindustantimes.com/technology/5-free-money-management-apps-that-actually-helped-me-track-every-rupee-spent-101750406683767.html) · SMS-reading mechanics (https://www.livemint.com/money/personal-finance/expense-tracking-apps-the-pros-and-cons-of-automated-expense-tracking-through-sms-emails-and-aa-system-11691082001354.html) · Money Manager (https://play.google.com/store/apps/details?id=com.realbyteapps.moneymanagerfree&hl=en_US) · ET Money (https://www.etmoney.com/) → ET Money sync + wealth positioning (https://joinfingrad.com/blog/expense-tracker-apps-that-sync-with-indian-banks-in-2025/) · Fi Money iOS gap (iOS users report no SMS-style auto-tracking outside these neo-banks: https://www.reddit.com/r/IndiaInvestments/comments/17feuei/fi_moneyjupiter_just_for_tracking_expenses_will/) · Jupiter Money Manager (https://jupiter.money/money/ ; https://jupiter.money/blog/best-expense-tracker-app/ ; https://jupiter.money/) · Indian listicle (https://moneyview.in/insights/best-personal-finance-management-apps-in-india) · Lekhhaa tiffin-as-category (https://lekhhaa.com/blog/splitwise-alternative-india) · Spentt positioning (https://www.spentt.live/blog/best-free-expense-tracker-india.html) · Dailychalan student tracker (https://www.dailychalan.com/blog/expense-tracker-for-students-india-2026/)

**Takeaway:** the strongest Indian auto-capture play (Walnut SMS parsing) folded into an NBFC-led brand (axio) whose centre of gravity is now **lending**, and early-2026 Play Store user reviews report missed/duplicated transactions and a broken export. Everything else is either bank-bound (Fi, Jupiter, ET Money) or manual-only (Money Manager). No Indian consumer app models anything beyond transactions.

---

## 3. Consumption / metered-consumption trackers

| Category | Finding | Source |
|---|---|---|
| **Tiffin/mess management software (MessMitra)** | B2B: digitises menus, meals and expenses for **providers** (hostels, PGs, corporate canteens, tiffin services) — not a personal "how many meals did I consume" tracker | https://messmitra.com/ ; https://messmitra.com/features |
| **Canteen/tiffin in expense apps** | Tiffin appears only as a **shared-expense category** (e.g., Lekhhaa bills a tiffin/dabba service); no app counts metered consumption ("N meals used out of M paid") against the money spent | https://lekhhaa.com/blog/splitwise-alternative-india |
| **Habit/streak apps (Streaks, Habitica, Loop, HabitNow)** | Track arbitrary daily counters and streaks (meals could be hacked into one), but they are **disconnected from money** — no spend linkage, budgets, or reports | https://zapier.com/blog/best-habit-tracker-app/ ; https://habitbox.app/blog/best-habit-tracker-app ; https://play.google.com/store/apps/details?id=org.isoron.uhabits&hl=en_IN ; https://clockify.me/blog/productivity/best-habit-tracker-apps/ |
| **Gullak-style** | No verified consumer app found that tracks meal consumption against money (**not found — unverified**) | — |

**Takeaway:** personal, **metered** consumption tracking fused with finance (e.g., "33 tiffin meals consumed of the 45 prepaid this month, ₹0 spent outside") does not appear to exist anywhere. The nearest neighbours are B2B mess software and money-blind habit trackers.

---

## 4. LLM-native / agentic finance apps (2024–2026)

| App | What it actually is | Source |
|---|---|---|
| **Cleo (Fin)** | The only clearly LLM-native consumer money product: conversational AI money coach; "Cleo 3.0" launched May 2025; 8M+ users; chat-first budgeting + cash advance (up to $250); free tier + $5.99/mo premium; **US-focused** (USD/bank sync/cash advance unusable in India) | https://web.meetcleo.com/ ; https://apps.apple.com/us/app/cleo-ai-cash-advance-budget/id1447274646 ; https://play.google.com/store/apps/details?id=com.meetcleo.cleo&hl=en_IN ; https://aimoneyvault.app/resources/comparisons/ai-money-vault-vs-cleo ; https://checkthat.ai/brands/cleo-ai-inc |
| **Magnifi** | AI investing assistant (chat over investment choices), free + ~$5.99/mo | https://findalternatives.net/ai-agents/best-ai-agents-in-personal-finance |
| **ADHD-money apps (Fella etc.)** | Not found / not enough sources captured — **unverified** | — |
| **YC money-agent startups** | No individually verifiable agentic-finance product surfaced in searches this round; "**agentic finance**" remains mostly a development-cost/article topic (e.g., "build a Cleo-like app for $10K–$300K") — **unverified** | https://appwrk.com/insights/cost-to-build-ai-budgeting-app ; https://appinventiv.com/blog/cost-of-ai-budgeting-app/ |

**Takeaway:** Cleo proves consumer appetite for a chatty money assistant, but nobody has combined a conversational LLM front-end with India-native capture (SMS/UPI), a richer memory model, and metered-consumption tracking.

---

## 5. Gap analysis vs PFOS's five pillars

1. **NL capture**
Capture today is three flavours: bank sync (Mint-descendants, Monarch, Copilot, Rocket Money, ET Money, Jupiter — all useless in India without UPI/SMS rails), SMS parsing (axio, Android-only, brittle and degrading per 2026 reviews), or manual forms (Money Manager, YNAB). **Nothing offers natural-language capture** ("spent 240 on auto to office, plus two veg tiffins") that also creates structured, categorised transactions in one shot. ([axio SMS reality](https://play.google.com/store/apps/details?id=com.daamitt.walnut.app&hl=en_US) ; [manual forms](https://play.google.com/store/apps/details?id=com.realbyteapps.moneymanagerfree&hl=en_US))

2. **Financial memory (transactions/decisions/commitments/consumption)**
Every app that could be confirmed stores **transactions only** (add-ons: YNAB's forward-looking allocations/goals, axio's bill reminders). No product models *decisions* ("decided to cut food delivery to ₹2k") or *commitments* ("I promised to cap Zomato at 8 orders/month") as first-class, queryable memory. (streams: [YNAB featureList — goals, memos per transaction](https://www.ynab.com) ; [transaction-only pattern across Copilot/Monarch comparisons](https://getfinny.app/blog/copilot-money-vs-monarch-money-2026))

3. **Budget monitoring**
Budgets exist everywhere in developed markets (Copilot, Monarch, YNAB, Rocket Money) but are either USD-priced/US-bank-bound or, in India, thin (axio basic spend tracking). None automatically *nudge in a conversational way mid-month* — Cleo-style chat exists in the US only, and is not coupled to India-native budgets. ([Cleo US](https://apps.apple.com/us/app/cleo-ai-cash-advance-budget/id1447274646) ; [axio budget basics](https://play.google.com/store/apps/details?id=com.daamitt.walnut.app&hl=en_US))

4. **Recurring + consumption tracking**
Recurring bills: handled decently (bill reminders in axio; subscription detection in Rocket Money/Emma). **Metered consumption is absent**: tiffin/mess consumption is only tracked by B2B software, and habit apps that can count things have zero money linkage. No consumer app answers "prepaid 45 meals, consumed 38, overspent outside the plan". ([MessMitra is provider-side](https://messmitra.com/) ; [tiffin as mere category](https://lekhhaa.com/blog/splitwise-alternative-india) ; [habit apps money-blind](https://zapier.com/blog/best-habit-tracker-app/))

5. **Automated reports**
Reports are generic dashboard charts everywhere, in India often broken or manual (axio export reportedly broken in a 2026 review; Money Manager offers manual weekly/monthly views). Nothing generates a *narrative, scheduled* money report (what changed vs last month, decision adherence, consumption-vs-compositors). ([axio review complaint](https://play.google.com/store/apps/details?id=com.daamitt.walnut.app&hl=en_US) ; [Money Manager report style](https://play.google.com/store/apps/details?id=com.realbyteapps.moneymanagerfree&hl=en_US))

---

## 6. Gap table (gap → who fails it → how PFOS addresses it)

| # | Gap | Competitors that fail it | How PFOS addresses it |
|---|---|---|---|
| 1 | **India-native NL capture** — no app lets you type/say "spent ₹240 on auto" and get a clean, categorised entry; US aggregators don't work with UPI at all | Copilot, Monarch, YNAB, Rocket Money (US bank-sync only); axio (SMS only, no NL, degrading accuracy per 2026 reviews); Money Manager (manual forms) | Natural-language expense capture as the primary entry point, India-aware (UPI, ₹, local merchant names) |
| 2 | **Memory beyond transactions** — no confirmed product records decisions or commitments; apps only keep a flat transaction ledger + (at best) goals | Mint-descendants, Copilot, Monarch, axio, Fi, Jupiter, ET Money — all transactions-only (verified YNAB stops at goals/memos) | Financial memory spanning transactions + decisions + commitments in one queryable store |
| 3 | **Metered consumption tracking** ("N of M meals consumed") fused to money — literally nobody does this for a consumer | All global aggregators; all Indian apps; habit trackers are money-blind; MessMitra is B2B provider software | First-class consumption records tied to the tiffin/meal budget — spend-vs-consumed reconciliation |
| 4 | **Conversational/agentic money assistant in India** — the only LLM-native player (Cleo) is US-only | Cleo (USD, US banks, cash-advance centric), Magnifi (investing); Indian apps have zero chat | Agentic assistant that also *acts*: reports, reminders, budget nudges grounded in the user's own memory (avoiding axio's broken-export class of problems: [source](https://play.google.com/store/apps/details?id=com.daamitt.walnut.app&hl=en_US)) |
| 5 | **Survivor risk + privacy** — the category leader (Mint) was killed overnight (Mar 2024) and India's default (Walnut) got absorbed into a lending funnel; bank-sync apps require account credentials | Mint, Walnut/axio (product pivots); Fi/Jupiter (self-bank-linked lock-in); bank-sync US apps (credential risk) | Self-contained, manual-first capture (no bank credentials required to work), portable memory, automated *narrative* reports instead of just charts |

---

### Open items / unverified (carry into next research task)
- Exact pricing for Monarch, Rocket Money, Emma, Wallet, Spendee — **unverified** (functional pricing confirmed only for Copilot $13/mo and YNAB $14.99/$109). Verify on official pricing pages later, at [getfinny.app](https://getfinny.app/blog/copilot-money-vs-monarch-money-2026) as a starting point.
- Fi Money shutdown rumors and CRED/Jar current billing — **unverified** in this round.
- ADHD-money space (Fella, Sidekick, etc.) and specific YC agentic-finance startups — **not found this round; unverified**.
- Axio quality-collapse reports are from a *single user review* on the official listing (https://play.google.com/store/apps/details?id=com.daamitt.walnut.app&hl=en_US) — treat as signal, not proof.
