// Regression guard for the §2.5 prompt digest — Slice 7 (5 unlisted phrasings
// never produce invented numbers; everyday Hinglish is normal).
import { describe, expect, it } from "vitest";
import { SYSTEM_PROMPT } from "@/lib/agent/system-prompt";

describe("system prompt digest (§2.5)", () => {
  it("ALWAYS forbids model-computed money math", () => {
    expect(SYSTEM_PROMPT).toMatch(/NEVER compute|never.*compute/i);
    expect(SYSTEM_PROMPT).toMatch(/verbatim/i);
  });
  it("includes the everyday-phrasing rule (no invented facts, no scolding)", () => {
    expect(SYSTEM_PROMPT).toMatch(/Hinglish|everyday phrasings/i);
    expect(SYSTEM_PROMPT).toMatch(/ask for exactly that one missing fact/i);
  });
  it("treats ₹-less amounts as rupees and everything else via the draft flow", () => {
    expect(SYSTEM_PROMPT).toMatch(/items may appear WITHOUT a ₹|₹ sign/i);
  });
  it("forbids answering with a figure that wasn't in a tool result", () => {
    expect(SYSTEM_PROMPT).toMatch(/wasn't in a tool result|say so plainly/i);
  });
  it("keeps the one-tool-per-turn and non-judgmental framing", () => {
    expect(SYSTEM_PROMPT).toMatch(/One intent at a time/i);
    expect(SYSTEM_PROMPT).toMatch(/never moralize/i);
  });
});
