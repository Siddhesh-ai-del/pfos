<!--
  Conventional commit title: feat: | fix: | refactor: | docs: | test: | chore: | perf: | ci:
-->

## What does this PR change?

<!-- One or two sentences: the behavior change, not the mechanics. -->

## Type of change

- [ ] feat — new capability
- [ ] fix — behavior fix (a failing repro existed)
- [ ] refactor — structure only, behavior unchanged
- [ ] docs — documentation only
- [ ] test — tests only
- [ ] chore / perf / ci

## How was it verified?

- [ ] Tests written before implementation (test-first)
- [ ] `npx vitest run` passes locally (all suites)
- [ ] `npx tsc --noEmit` clean
- [ ] Money-path change: every number a user can see still traces to a Postgres
      RPC result (no model-computed figures)

## Checklist

- [ ] Conventional commit title
- [ ] Draft-then-confirm invariant preserved for any new write path
- [ ] Audit trail written for any new tool/RPC surface (with idempotency key)
- [ ] No secrets, keys, or personal data in the diff
- [ ] CHANGELOG.md updated
- [ ] Design-token compliance for any UI change (docs/design-direction.md)
