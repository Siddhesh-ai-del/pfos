import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getSupabase } from "@/lib/supabase-server";
import { makeOpenRouterLlm } from "@/lib/agent/llm";
import { runWeave } from "@/lib/agent/weave";
import { demoModeEnabled } from "@/lib/demo";
import { checkRate, clientKey } from "@/lib/rate-limit";

// POST /api/agent — the single weave loop (§5.1 / §5.5).
// Server-only demo gate + per-IP rate limit. Body:
// {messages: [{role:'user'|'assistant', text, tool_cards_evicted?}]}
// → {reply, cards: DraftCard[], refresh: boolean, toolTrace: string[]}

const turnSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    text: z.string().max(4000),
  })
  .strict();

const bodySchema = z
  .object({
    messages: z.array(turnSchema).min(1).max(40),
  })
  .strict();

export async function POST(req: NextRequest) {
  if (!demoModeEnabled()) {
    return NextResponse.json({ error: "demo_mode_disabled" }, { status: 403 });
  }
  if (!checkRate(`agent:${clientKey(req)}`, 20)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parse = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parse.success) {
    return NextResponse.json(
      { error: "bad_request" },
      { status: 400 }
    );
  }

  const requestId = randomUUID();

  let llm;
  try {
    llm = makeOpenRouterLlm();
  } catch (e) {
    console.error("LLM provider unavailable:", e);
    return NextResponse.json(
      {
        reply:
          "I'm not connected to my language provider yet. Set OPENROUTER_API_KEY and try again.",
        cards: [],
        refresh: false,
        toolTrace: [],
      },
      { status: 503 }
    );
  }

  const supabase = getSupabase();
  const out = await runWeave(supabase, llm, {
    requestId,
    messages: parse.data.messages,
  });

  return NextResponse.json(
    { reply: out.reply, cards: out.cards, refresh: out.refresh, toolTrace: out.toolTrace },
    { status: out.httpStatus }
  );
}
