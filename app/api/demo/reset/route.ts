import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

// POST /api/demo/reset — wipes demo user rows + re-runs seed in one RPC (plan §5.6 / §2.2).
export async function POST(_req: NextRequest) {
  if (process.env.NEXT_PUBLIC_PFOS_DEMO_MODE !== "1") {
    return NextResponse.json({ error: "demo mode disabled" }, { status: 403 });
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("reset_demo_data");
  if (error) {
    console.error("reset_demo_data failed:", error.message);
    return NextResponse.json({ error: "reset failed" }, { status: 500 });
  }
  return NextResponse.json(data);
}
