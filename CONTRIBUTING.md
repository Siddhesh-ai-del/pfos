# Contributing to PFOS

Thank you for considering a contribution. This project is in pre-release
development; the fastest way to help right now is a precise bug report or a
well-argued feature idea.

## Reporting bugs

Use the [bug report template](https://github.com/Siddhesh-ai-del/pfos/issues/new?template=bug_report.yml).
Please include what you said, what the system replied, and the exact numbers
shown on screen. Do not include tokens, API keys, or your environment files.

## Suggesting features

Use the [feature request template](https://github.com/Siddhesh-ai-del/pfos/issues/new?template=feature_request.yml).
Describe the problem you hit before the solution you want, and state which
project principle it advances.

## Standards

- **Test-driven development.** Behavior changes are written test-first. The
  project targets a minimum of 80% coverage on the money paths (tool
  executor, RPC contracts, formatting).
- **Determinism.** The language model never computes money math. Every number
  rendered to a user must trace to a Postgres RPC result. A pull request that
  lets a model-sourced number reach the UI will not be merged.
- **Draft-then-confirm.** Writes are drafts until a user action confirms
  them. Any new write path must keep this property and write an audit trail
  with an idempotency key.
- **Conventional commits.** Titles follow `type: description` (types: feat,
  fix, refactor, docs, test, chore, perf, ci).
- **Style.** Go with the flow of the surrounding code: many small files,
  strict TypeScript, no mutation of shared state.

## Pull requests

1. Fork and create a feature branch from `main`.
2. Write or extend the tests for the change first.
3. Implement to green; keep the full suite passing.
4. Verify no secrets in the diff and update [CHANGELOG.md](CHANGELOG.md).
5. Use the [pull request template](https://github.com/Siddhesh-ai-del/pfos/compare).

Review is best-effort; there is no response SLA at this stage.

## Code of conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
