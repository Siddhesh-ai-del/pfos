# Security Policy

PFOS is a personal finance product; it encodes absolute trust boundaries around
what a language model is allowed to do to your ledger. Please treat its
security reports with the same seriousness.

## Supported versions

Pre-release. Security fixes are applied to `main` only; there are no
published releases to backport to yet.

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Report privately through GitHub security advisories:

1. Go to https://github.com/Siddhesh-ai-del/pfos/security/advisories/new
2. Describe the issue, its impact, and a minimal reproduction (steps, payload,
   or diff). Attach proof-of-concept code if useful.
3. If the issue involves the LLM agent boundary, include the raw conversation
   and any audit log rows that demonstrate the bypass.

Responsiveness is best-effort with no fixed SLA while the project is
pre-release; acknowledged reports will receive a status update as triage
proceeds. Issues affecting the agent trust boundary (tool whitelist, draft
confirmation, audit integrity) are treated as the highest class of severity.

## Scope

### In scope

- The tool-calling executor: bypassing the whitelist, injecting unvalidated
  arguments, reaching an RPC outside the whitelist, or smuggling money math
  into model output
- The audit log: mutating, forging, or dropping rows such that a replay
  produces a different committed state
- The draft-then-confirm invariant: any path that persists a transaction or
  consumption record without an explicit user confirmation step
- The demo reset and seed functions and their idempotency guarantees
- Secret handling: hardcoded credentials, leaked service keys, or RLS
  policies that grant broad access

### Out of scope

- Reports about the local demo seeded data (it is deliberately fake and is
  healed by the reset function)
- Volumetric attacks against a nonexistent public deployment
- Reports that require a paid Supabase/Auth0/customer account (none exist at
  this stage)

## Guarantees to reporters

- Your report stays private until a coordinated disclosure you agree to
- You will not be asked to withhold details from anyone but the maintainers
- If you wish, your handle is credited in a security note once the fix ships

## Hardening posture

The codebase already enforces: strict zod schemas on every tool call before
any RPC; an immutable, replayable audit trail; row-level security enabled
deny-all by default; the service key held only in server-side environment
variables; and a hard cap on tool iterations per user turn.
