# Verification — pfos-research (direct mode, lead-reviewed)

Date: 2026-11-03 · Reviewer: lead · Mode: direct search (no verifier/reviewer subagents per deepresearch rules)

## Checks performed

1. **Citation sweep**: every load-bearing claim in the cited draft maps to a URL in the T1/T2/T3 source notes with captured text.
2. **Spot-verified live URLs (webfetch, 2026-11-03):**
   - https://pmc.ncbi.nlm.nih.gov/articles/PMC5428074 — CHI 2016 paper present; guilt quote (p163) verbatim: "I felt guilty every time I tracked an expense that was not a necessity"; survey n=193 + 12 interviews confirmed. ✅
   - https://openai.github.io/openai-agents-python/human_in_the_loop/ — page live; approval/interruption flow, server-owned approval state sections confirmed. ✅
   - https://docs.stripe.com/mcp — page live; `stripe_api_read`/`stripe_api_write` separation and "Human confirmation" badges confirmed; also confirms idempotency/approval-token framing. ✅
   - https://homes.cs.washington.edu/~jfogarty/publications/chi2016-abandonment.pdf — server responded, PDF (cannot text-fetch; PMC mirror above used as verification substitute). ⚠️ verified-by-mirror
3. **Single-vendor stats demoted**: "85% abandon" and Monarch/Rocket Money/Emma pricing marked **do not cite / unverified** in the brief. RevenueCat conversion figure kept with its PDF link.
4. **No invented features**: claims about app internals sourced to official product pages (ynab.com structured data, Play Store listings, monarch.com) or marked unverified.
5. **Inference markers**: "financial memory wedge", "estimated vs confirmed" phrasing, Next.js mapping, tiffin hypothesis — all explicitly tagged as inference/hypothesis.

## Findings

- **FATAL**: none.
- **MAJOR**: none.
- **MINOR-1**: Mint shutdown sourced to secondary blogs (Plisio, orbitmoney, Tiller community) rather than an Intuit announcement page — claim retained but consider finding an Intuit primary source before deck use.
- **MINOR-2**: UPI Dec-2025 record figures corroborated across three secondary outlets (BusinessLine/CNBC-V18/Business Standard) but not NPCI's own release; acceptable for a hackathon brief, fetch NPCI data before statutory-style claims.
- **MINOR-3**: axio "degrading export/accuracy" rests on one review; phrasing in brief already softened to "user reviews report".

## Verdict

**PASS WITH NOTES** — safe for ideation and planning use.

## Ratings (imperfections only)

- Pricing rows for Monarch/Rocket Money/Emma lack official-page confirmation.
- Primary-source gap noted in MINOR items above.
