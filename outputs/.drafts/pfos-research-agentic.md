# T2 Findings — Agentic finance patterns & trust/safety

Research brief: `outputs/.plans/pfos-research-T2.md`
Searches used: 7 (websearch) + 3 document fetches. Sources recorded inline with each claim. Anything not directly sourced is marked **[inference]**.

---

## 1. Architecture notes

### 1.1 The tool-calling loop: the model never executes anything

- Anthropic's docs frame tool use as a contract: "The model never runs anything on its own. It emits a structured request, your code (or Anthropic's servers) runs the operation, and the result flows back into the conversation." For client-executed tools, the application drives a `while` loop keyed on `stop_reason`: model asks → app executes → app reports back → model continues. (https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works)
- Anthropic tool-use overview: Claude decides *when* to call a tool from the tool's description, returns a `tool_use` block, and the app executes it and returns `tool_result`. (https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- **For PFOS**: the LNL (natural-language) expense statement like "paid ₹250 for lunch" should produce a structured tool call; the tool executor (server-side) does all reading/writing. **[inference]** This exact shape maps 1:1 onto a Next.js route (`app/api/agent/...`) calling a server-side executor that talks to Supabase.

### 1.2 Constrain the agent's surface: strict schemas, whitelists, few tools

- OpenAI function calling: "Setting `strict` to `true` will ensure function calls reliably adhere to the function schema, instead of being best effort. We recommend always enabling strict mode." Strict mode requires `additionalProperties: false` and all fields `required`. (https://developers.openai.com/api/docs/guides/function-calling)
- Same doc + community thread: strict mode is disabled for parallel tool calls from fine-tuned models; if you need guaranteed schemas, set `parallel_tool_calls: false` so you get "exactly zero or one tool call." (https://developers.openai.com/api/docs/guides/function-calling, https://community.openai.com/t/parallel-tool-use-documentation-for-api-models/1304519)
- Anthropic's tool-design engineering guide: "More tools don't always lead to better outcomes"; consolidate multi-step operations into one tool with metadata (e.g., prefer a `schedule_event` over `list_users` + `list_events` + `create_event`); namespace tools by domain (`asana_*`, `jira_search`) so agents pick the right one; prompt-engineer descriptions and use unambiguous parameter names (`user_id`, not `user`). (https://www.anthropic.com/engineering/writing-tools-for-agents)
- Anthropic's "think" tool research: adding a trivial no-input `think` tool significantly improves policy adherence in long tool-call chains; minimal code, instructions placed in the system prompt. (https://www.anthropic.com/research/claude-think-tool)

### 1.3 Confirmation gates / human-in-the-loop for consequential (money) actions

- OpenAI Agents SDK ships a first-class HITL flow: tools declare `needs_approval=True` or an approval predicate; when the model calls them, the run **pauses** and returns `interruptions` with the tool name and arguments; the host app calls `state.approve(...)`/`state.reject(...)` and resumes. Rejections return a model-visible message ("Publish action was canceled because approval was rejected."). (https://openai.github.io/openai-agents-python/human_in_the_loop/)
- Same page: for consequential side effects, "the application should assign a stable idempotency key to each logical action… Reuse the same key and action parameters across retries" — approval does not guarantee exactly-once execution; a payment can complete twice if state is lost. Approval decisions should be kept in **server-owned storage**, with the reviewer authenticated against the server, never the client. (https://openai.github.io/openai-agents-python/human_in_the_loop/)
- Stripe's official MCP server separates read vs write surfaces (`stripe_api_read`, `stripe_api_write`) and has an explicit section, "Confirm actions by agents acting on your behalf," covering what agent-initiated changes mean for permissions. (https://docs.stripe.com/mcp)
- Risk-tiering guidance: classify endpoints into tiers — auto-execute reads/idempotent ops, notify-only for low-risk writes, synchronous approval only for consequential actions (payment writes, deletion, bulk updates) — to avoid "confirmation fatigue." (https://truto.one/blog/implementing-human-in-the-loop-approval-workflows-for-consequential-saas-api-actions)
- Finance-ops essay: approval steps are *controls*; letting an LLM say "yes" to an invoice "is not an approval, it is a gap in the control." The working pattern is "scoped AI for genuine judgment steps, gated by a confidence threshold, wrapped in repeatable workflow code, with uncertain cases routed to a human reviewer"; LLMs are "not safe to use unsupervised for anything that must reproduce exactly, such as posting journal entries or approving payments" (https://loopfour.ai/blog/llms-in-finance)

### 1.4 Real-world agentic money products (examples, not just patterns)

- **Stripe MCP**: official MCP server exposing Stripe API read/write + knowledge-base search to agents. (https://docs.stripe.com/mcp)
- **Plaid MCP**: hosted Dashboard MCP announced May 1, 2025 for developer/monitoring workflows; Plaid explicitly states "Claude does not have access to consumer financial data" — diagnostics only, bank data stays behind the API. (https://plaid.com/blog/plaid-mcp-ai-assistant-claude, https://www.scalekit.com/blog/plaid-mcp-vs-api)
- **Consumer personal-finance MCP products exist and are selling the anti-hallucination angle**: "ask Claude 'what did I spend on food last quarter?' and get a real answer — not a hallucinated estimate" (https://banksync.io/blog/best-mcp-servers-personal-finance-2025); Era Context's MCP server connects accounts once so any MCP-compatible agent can read balances/transactions and move money (movement is in private beta). (https://era.app/context/mcp-server)
- **Revolut AIR (Apr 2026)**: in-app assistant for spending/budget/card controls; "Sensitive actions require biometric approval" and personal data is not stored by third-party AI partners. (https://github.com/kennethleungty/finance-llms)
- Market commentary frames MCP as the standard route to "your own personal financial dashboards… by finding and using the right MCP server," with the open question being security/controls. (https://www.fintechbrainfood.com/p/mcp)

### 1.5 Context/memory patterns for money

- Standard agent-memory taxonomy: short-term memory is the live conversation window; long-term memory is persistent and divides into **semantic** (facts & preferences), **episodic** (past interactions & outcomes), and **procedural** (learned rules/instructions); "true personalization" lives in long-term memory and is loaded into context when relevant. (https://www.philschmid.de/memory-in-agents, https://valkey.io/blog/ai-agent-memory-with-valkey-and-mem0)
- Write-gate pattern: don't write memory inline in the agent's hot loop; asynchronously extract candidate facts/preferences from raw session events in a background process, and record a **confidence at write time** (explicit user statement > inferred from behavior > confirmed across episodes) so retrieval/conflict handling can be mechanical. (https://hidekazu-konishi.com/entry/ai_agent_memory_design_guide.html)
- Same source: long-term memory stores facts, preferences, "account details, important decisions" and stable project constraints — i.e., exactly PFOS's "financial memory" (decisions, preferences, commitments). (https://aaif.io/blog/agent-memory-patterns-tradeoffs-open-problems)
- A financial-agent memory worked example: storing analyst preferences ("prefer EV/Revenue for negative-EBITDA," "always call out whether margin expansion is assumed") changes the answer from generic ("EV/EBITDA may be appropriate…") to preference-aware ("Because you prefer EV/Revenue…"); the author's compliance note: the agent is "a preference-aware calculator, not an investment advisor," and memory needs permission scoping beyond `user_id`. (https://mem0.ai/library/agent-memory/build-a-financial-ai-agent-that-remembers-analyst-preferences)
- **"Financial memory" as a named product concept**: no venture-backed product page found in this pass punning on that exact phrase; closest public artifacts are the preference-memory finance-agent write-ups above and episodic-retrieval-for-financial-decision-making academic work (arXiv:2609.28771, AACL-IJCNLP 2026 findings). (https://arxiv.org/abs/2609.28771) **[inference]** This suggests "financial memory" is a differentiating wedge, not a crowded keyword.
- Code-execution research (Anthropic): present tools as code APIs; intermediate results stay in the execution environment so "the agent only sees what you explicitly log or return" — sensitive data can flow tool-to-tool tokenized, never through the model; deterministic control flow (loops, filters, aggregation) runs in code. (https://www.anthropic.com/research/code-execution-with-mcp)

---

## 2. Recommendations for PFOS (Next.js + Supabase + LLM tool calling)

Cheap = no external infra beyond existing stack (Supabase rows, Postgres RPC, Next.js API routes/server actions).

### R1. Strict-schema tool whitelist with a thin read/write surface ⭐ cheap
Define 5–10 PFOS tools only (e.g. `log_expense_draft`, `confirm_transaction`, `query_ledger`, `get_month_summary`, `log_meal_consumption`), with `strict: true` on every schema (OpenAI) / full `input_schema` (Anthropic), disable parallel calls for reliability, namespace by domain (`pfos_ledger_*`, `pfos_meal_*`), and prompt-engineer descriptions + unambiguous param names per Anthropic's guide. The model emits structured calls only; a server executor validated and executed them.
- Sources: https://developers.openai.com/api/docs/guides/function-calling · https://www.anthropic.com/engineering/writing-tools-for-agents · https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works
- Build cost: **Low.** Tool registry is a typed TS/Next.js module; no extra services.

### R2. Draft-then-confirm gate: LLM proposes, human confers safety ⭐ cheap (this is the flagship trust pattern)
Every transaction/meal is first written as an **estimated/draft row** (`status: 'estimated'`, LLM's structured proposal displayed as an editable card); only a user action (tap Approve / chat "yes") promotes it to `confirmed` via a server action. Consequential-but-automated actions (e.g., auto-post of large spends) route through an approval pause like OpenAI's `needs_approval` interruption flow. Keep a `confirmations`/audit table: who approved, what arguments, when. This productizes "estimated vs confirmed" separation and "never invent a transaction": an LLM-proposal that is never user-confirmed and never shown as a committed amount.
- Sources: https://openai.github.io/openai-agents-python/human_in_the_loop/ (pause/approve/resume, rejections feed back a message) · https://truto.one/blog/implementing-human-in-the-loop-approval-workflows-for-consequential-saas-api-actions (risk tiering: reads auto, writes gated, to prevent confirmation fatigue) · https://docs.stripe.com/mcp (confirm actions by agents acting on your behalf)
- Build cost: **Low.** Supabase tables + a `status` column + React approve/reject UI. **[inference]** The "estimated vs confirmed" wording is PFOS's own synthesis of HITL + risk-tiering patterns; no single source uses that phrase.

### R3. Never compute money math in the LLM — deterministic Postgres functions ⭐ cheapest
All sums, breakdowns, month totals and budget thresholds are Supabase Postgres RPC functions (`get_month_summary`) called from the tool executor; the LLM selects *which* numbers to show, never calculates them. Anthropic's code-execution research motivates the same principle (filter/aggregate in the execution environment before results hit the model); and finance-ops writing says LLMs are unsupervised-unsafe for anything that must reproduce exactly.
- Sources: https://www.anthropic.com/research/code-execution-with-mcp · https://loopfour.ai/blog/llms-in-finance
- Build cost: **Very low.** SQL is already deterministic; Supabase RPC is native to the stack.

### R4. Consolidated, high-signal read tool instead of raw table dumps ⭐ cheap
Instead of `list_transactions` returning 200 rows to the model, one `get_context` tool per surface returns pre-aggregated, semantically named rows (natural-language names, not UUIDs; a `response_format: detailed|concise` enum like Anthropic recommends) plus budget deltas. Keeps tokens low and drives demos' ground truth from SQL, not generated prose — what consumer MCP products market as "get a real answer, not a hallucinated estimate."
- Sources: https://www.anthropic.com/engineering/writing-tools-for-agents (consolidation, response_format enum, natural names, truncation/pagination) · https://banksync.io/blog/best-mcp-servers-personal-finance-2025 (grounded answers via MCP)
- Build cost: **Low.** Supabase views / RPC with pagination defaults, trimming token costs.

### R5. Two-layer memory: ephemeral chat thread + durable "financial memory" table ⭐ medium-cheap
Short-term: the live conversation window only. Long-term: a `financial_memory` table (type: preference | decision | commitment | rule; content; source; confidence) with **asynchronous extraction** from sessions (background job). Explicit user statements get higher confidence than inferred ones. Retrieve by type/keyword/recent-usage at turn start, injected as compact system context. PFOS-specific trick: memory of *commitments* ("I'm cutting tiffins from next week") → surfaced against budgets and tiffin-consumption reports.
- Sources: https://www.philschmid.de/memory-in-agents + https://valkey.io/blog/ai-agent-memory-with-valkey-and-mem0 (semantic/episodic/procedural split) · https://hidekazu-konishi.com/entry/ai_agent_memory_design_guide.html (async write-gate, confidence at write time) · https://mem0.ai/library/agent-memory/build-a-financial-ai-agent-that-remembers-analyst-preferences (preference-aware finance answers; permission-scoping warning)
- Build cost: **Medium-low.** Supabase rows + a nightly/batched LLM-summaries job. **[inference]** no off-the-shelf memory product needed at MVP cut.

### R6. Audit trail + idempotency on every consequential write ⭐ cheap
Every LLM-initiated write gets a row: tool name, arguments, model, timestamp, approval state, executor result, plus a stable idempotency key reused across retries so crash-resumed runs never double-post money actions (OpenAI docs: "assign a stable idempotency key to each logical action… approval… cannot make the external action and the saved run state one atomic operation"). Encourage a "PII/amounts shown to the model are minimized" posture like Anthropic's tokenization pattern.
- Sources: https://openai.github.io/openai-agents-python/human_in_the_loop/ · https://www.anthropic.com/research/code-execution-with-mcp · governance taxonomy shares audit-trail recommendations for LLM outputs (https://www.getaleph.com/answers/best-llms-for-finance-teams-2026)
- Build cost: **Low.** A Postgres table + `ON CONFLICT DO NOTHING` idempotency via unique key; Next.js writes treat each call as a transaction.

---

## 3. Flagged speculation / open questions

- **[inference]** "Financial memory" as an explicit product positioning term is not yet widespread; PFOS's "sticky memory of decisions, preferences, and commitments" is a differentiating wedge (memo § 1.5).
- **[inference]** WhatsApp-style Indian expense capture has not been covered by public engineering write-ups located in this pass; recommend a follow-up search on India-specific agentic fintech (e.g., ChatGPT/UPI cash flow write-ups, Cred/Cleo blog) if needed.
- Open source example write-ups for NL expense capture exist as medium/blog-level content with sample architectures (e.g., PHP/Flask/MySQL with Gemini LLM-generated SQL and validated-execution middleware) but are not from authoritative vendors — noted, not relied upon for any specific claim above. (https://www.ijsrtjournal.com/article/AIDriven-Financial-Assistant-for-Smart-Expense-Tracking)
