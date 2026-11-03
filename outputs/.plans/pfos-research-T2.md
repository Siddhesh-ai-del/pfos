# T2 Brief — Agentic finance patterns & trust/safety

Research how LLM-native "agentic" finance products are built in 2025–2026, focusing on architecture patterns that make them trustworthy + demoable.

Find:

1. **Tool-calling patterns** — OpenAI function-calling / Anthropic tool-use docs for structured tools; how products constrain LLM agents on sensitive domains (whitelist tools, confirmation gates, human-in-the-loop).
2. **Real examples** — finance-agent write-ups, hackathon or startup blog posts, MCP (Model Context Protocol) servers for personal finance/money APIs.
3. **Trust/safety patterns for money apps**: "never invent a transaction", confirmation required for consequential actions, separation of *estimated vs confirmed* amounts, audit logs, deterministic math outside the LLM.
4. **Prompt/agent memory patterns**: short-term chat memory vs long-term financial memory (decisions, preferences, commitments). Any public write-up on "financial memory" as a product concept.

## Deliverable

Write findings to `outputs/.drafts/pfos-research-agentic.md`: short architecture notes + 4–6 pattern recommendations PFOS should adopt, each with a source URL. Note which patterns are cheap to build in a Next.js + Supabase + LLM tool-calling stack (Supabase row storage, Postgres functions for math, server-side tool executor, LLM never computes money math directly).

Rules:
- Use websearch + webfetch. Prefer official docs (OpenAI/Anthropic/MCP/Supabase) and reputable engineering blogs.
- Record exact URL next to each claim. No invented quotes or benchmarks.
- Aim ≤ 8 distinct searches. Prefer docs over long-form essays.
- Flag anything that is speculation or inference as such.
