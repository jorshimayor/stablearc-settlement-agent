import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/src/server/guard";
import { runSettlementTurn } from "@/src/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({ message: z.string().trim().min(1).max(500) });

/**
 * The StableArc settlement agent (Celo "Agents at Work" submission).
 *
 * A thin web wrapper over the transport-agnostic core: rate-limit, validate,
 * delegate to runSettlementTurn(), map the result onto HTTP. Understand a
 * plain-language request, turn it into an on-chain cross-border intent, and let
 * the autonomous solver settle it peer-to-peer in local currency — no US dollar
 * in the path.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "agent", 20, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reply: "Invalid request." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reply: "Say what you'd like to send." }, { status: 400 });
  }

  const result = await runSettlementTurn(parsed.data.message);
  const { status, ...payload } = result;
  return NextResponse.json(payload, { status });
}
