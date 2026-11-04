import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getSupabase } from "@/lib/supabase-server";
import { executeToolCall } from "@/lib/agent/executor";

// POST /api/confirm — the Confirm button's write path (§5.1).
// No-flag demo mode: entity "transaction" only; "meal" lands in Slice 5.

const bodySchema = z.object({
  entity: z.enum(["transaction", "meal"]),
  id: z.string().uuid(),
  idempotency_key: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_PFOS_DEMO_MODE !== "1") {
    return NextResponse.json({ error: "demo mode disabled" }, { status: 403 });
  }

  const parse = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parse.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (parse.data.entity === "meal") {
    const supabase = getSupabase();
    const r = await executeToolCall(supabase, {
      requestId: randomUUID(),
      toolName: "pfos_meal_confirm_consumption",
      rawArgs: {
        meal_id: parse.data.id,
        idempotency_key: parse.data.idempotency_key,
      },
    });
    if (r.error) {
      console.error("meal confirm failed:", JSON.stringify(r.toolResult));
      return NextResponse.json(
        { error: "confirm_failed", detail: r.toolResult },
        { status: 500 }
      );
    }
    const envelope = r.toolResult as {
      status: string;
      result: { row: unknown };
    };
    return NextResponse.json({ updated: envelope.result.row, refresh: true });
  }

  const supabase = getSupabase();
  const r = await executeToolCall(supabase, {
    requestId: randomUUID(),
    toolName: "pfos_ledger_confirm_transaction",
    rawArgs: {
      transaction_id: parse.data.id,
      idempotency_key: parse.data.idempotency_key,
    },
  });

  if (r.error) {
    console.error("confirm failed:", JSON.stringify(r.toolResult));
    return NextResponse.json(
      { error: "confirm_failed", detail: r.toolResult },
      { status: 500 }
    );
  }

  const envelope = r.toolResult as { status: string; result: unknown };
  return NextResponse.json({ updated: envelope.result, refresh: true });
}
