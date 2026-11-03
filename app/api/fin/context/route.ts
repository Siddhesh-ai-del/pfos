import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

// GET /api/fin/context — wraps get_financial_context RPC (plan §4.4).
// The context rail's only data source: numbers arrive verbatim from Postgres.
export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_financial_context");
  if (error) {
    console.error("get_financial_context failed:", error.message);
    return NextResponse.json({ error: "context unavailable" }, { status: 500 });
  }
  return NextResponse.json(data);
}
