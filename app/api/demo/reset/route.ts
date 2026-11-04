import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import { demoModeEnabled } from "@/lib/demo";
import { checkRate, clientKey } from "@/lib/rate-limit";

// POST /api/demo/reset — wipes demo user rows + re-runs seed in one RPC
// (plan §5.6). Server-only demo gate; reset destroys audit history, so it
// also requires PFOS_DEMO_RESET_TOKEN when set on the server.

export async function POST(req: NextRequest) {
  if (!demoModeEnabled()) {
    return NextResponse.json({ error: "demo mode disabled" }, { status: 403 });
  }
  if (!checkRate(`reset:${clientKey(req)}`, 5)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const token = process.env.PFOS_DEMO_RESET_TOKEN;
  if (token && req.headers.get("x-pfos-reset-token") !== token) {
    return NextResponse.json({ error: "reset_token_required" }, { status: 401 });
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("reset_demo_data");
  if (error) {
    console.error("reset_demo_data failed:", error.message);
    // never relay DB internals to the client (security review #8/#9)
    return NextResponse.json({ error: "demo reset failed" }, { status: 500 });
  }
  return NextResponse.json(data);
}
