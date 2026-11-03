# Changelog

All notable changes to PFOS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Pre-release. There are no published releases yet.

### Added

- Ledger schema migration: eleven tables with deny-all row-level security, thirteen
  Postgres RPCs covering budget status, day/month summaries, tiffin carryforward
  billing, and deterministic demo seed/reset functions.
- Demo foundation: server-rendered context rail (budgets, tiffin, month glance,
  memory) reading the same Postgres RPC surface the agent reads; demo reset API
  returning the UI to its seeded state.
- Agent backbone: versioned whitelisted tool schema (strict zod validation),
  single weave loop capped at three tool iterations, executor that returns
  verbatim Postgres envelopes, and an audit log recording every tool invocation
  (including rejected and unknown tools) with idempotency keys.
- LLM provider seam: OpenAI-compatible provider over plain HTTP, with a
  model-override fallback and a quiet failure state when unconfigured.
- Chat interface: labeled message log, collapsed tool-execution chips,
  Enter-to-send composer, and a live region for assistive technology.
- Test suite: vitest coverage for the tool whitelist, the seed arithmetic
  contract, and the weave/executor behavior against a real local database.
- Developer design system: documented tokens, type scale, semantic color rules,
  and state treatments governing all UI code.
- Community health set: contribution guide, code of conduct, security policy,
  support guide, issue templates, and pull request template.
