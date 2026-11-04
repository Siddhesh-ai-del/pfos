// PFOS demo-mode constants (plan §2.2 / §4.3). Single fixed demo user, no auth.
export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

// Server-only demo flag. NEVER prefix with NEXT_PUBLIC_ — it is not a secret,
// it is just a switch we don't want compiled into client bundles.
export function demoModeEnabled(): boolean {
  return process.env.PFOS_DEMO_MODE === "1";
}

export function formatINR(minor: number): string {
  // canonical formatter — the ONLY place ₹ formatting happens (plan §7 risk 2)
  const v = minor / 100;
  const neg = v < 0;
  const abs = Math.abs(v);
  // Indian digit grouping: 12,34,567.89
  const whole = Math.floor(abs);
  const frac = Math.round((abs - whole) * 100);
  const w = whole.toLocaleString("en-IN");
  return `₹${neg ? "-" : ""}${w}${frac ? "." + String(frac).padStart(2, "0") : ""}`;
}
