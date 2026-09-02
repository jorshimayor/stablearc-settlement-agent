// One settlement turn, transport-agnostic.
//
// This is the reusable heart of the agent: given a plain-language message, it
// understands it, prices it from our own realized flow, submits the intent
// on-chain (attribution tag in calldata), and settles it against opposing flow
// — then returns a structured result. Every surface calls this same function:
//
//   • the web API route            (app/api/agent/route.ts)
//   • the Telegram bot             (adapters/telegram/bot.ts)
//   • a MiniPay web view           (same web route)
//   • StableArc's own app, later   (import { runSettlementTurn })
//
// It never touches HTTP or a chat SDK — the transport wraps this and maps
// `status` onto its own error convention. Keep it that way.

import { parseSettlementRequest } from "./agent";
import { llmConfigured } from "./llm";
import { agentAddress, runCeloSolver, submitIntent } from "./solver";
import {
  celoAgentReady,
  celoCurrencyByCode,
  celoCurrencies,
  celoExplorerTx,
  celoPublicClient,
  CELO,
} from "./celo";
import { realizedRateOracleAbi } from "./abi";
import { formatUnits } from "viem";

// Slippage the agent accepts vs the realized rate when it has one.
const TOLERANCE = 0.03;

export type TurnResult =
  | {
      ok: false;
      /** True when the agent just needs the user to clarify (not an error). */
      needsInput?: boolean;
      reply: string;
      /** Suggested HTTP status for a web transport (200 for needsInput). */
      status: number;
    }
  | {
      ok: true;
      understood: string;
      matched: boolean;
      intent: { from: string; to: string; amount: number; recipient: `0x${string}` };
      submitTx: `0x${string}`;
      submitUrl: string;
      settlements: { kind: string; ids: string[]; tx: string; url: string }[];
      reply: string;
      status: 200;
    };

/** Is the agent fully wired on this environment (contracts + currencies + LLM)? */
export function agentEnvReady(): { ready: boolean; reason?: string } {
  if (!celoAgentReady() || !process.env.CELO_AGENT_PK) {
    return { ready: false, reason: "The Celo agent isn't deployed on this environment yet." };
  }
  if (!llmConfigured()) {
    return {
      ready: false,
      reason: "The agent's language model isn't configured (set LLM_API_KEY / LLM_BASE_URL).",
    };
  }
  return { ready: true };
}

/**
 * Runs one full settlement turn for a plain-language `message`.
 * Pure of any transport — safe to call from a route, a bot, or a test.
 */
export async function runSettlementTurn(message: string): Promise<TurnResult> {
  const env = agentEnvReady();
  if (!env.ready) return { ok: false, reply: env.reason!, status: 501 };

  // 1. Understand the request.
  let understanding;
  try {
    understanding = await parseSettlementRequest(message);
  } catch (e) {
    return {
      ok: false,
      reply: e instanceof Error ? e.message.slice(0, 160) : "The agent had trouble.",
      status: 500,
    };
  }
  if (!understanding.ok) {
    return { ok: false, needsInput: true, reply: understanding.message, status: 200 };
  }
  const intent = understanding.intent;

  const from = celoCurrencyByCode(intent.fromCode);
  const to = celoCurrencyByCode(intent.toCode);
  if (!from || !to) {
    const supported = celoCurrencies().map((c) => c.code).join(", ");
    return {
      ok: false,
      needsInput: true,
      reply: `I can move between ${supported} on Celo, but not ${intent.fromCode}→${intent.toCode} yet.`,
      status: 200,
    };
  }

  // 2. Price it from our own realized flow (no external feed). Fall back to a
  //    tiny floor if this corridor hasn't settled yet.
  let minOut = 1e-9;
  try {
    const client = celoPublicClient();
    const has = (await client.readContract({
      address: CELO.realizedOracle as `0x${string}`,
      abi: realizedRateOracleAbi,
      functionName: "hasData",
      args: [from.address, to.address],
    })) as boolean;
    if (has) {
      const rate1e18 = (await client.readContract({
        address: CELO.realizedOracle as `0x${string}`,
        abi: realizedRateOracleAbi,
        functionName: "latestRate1e18",
        args: [from.address, to.address],
      })) as bigint;
      const rate = Number(formatUnits(rate1e18, 18));
      if (rate > 0) minOut = intent.amount * rate * (1 - TOLERANCE);
    }
  } catch {
    /* keep floor */
  }

  const recipient = (intent.recipient ?? agentAddress()) as `0x${string}`;

  try {
    // 3. Create the intent on-chain (the agent acts).
    const submitTx = await submitIntent({
      tokenIn: from.address,
      tokenOut: to.address,
      amountIn: intent.amount,
      minAmountOut: minOut,
      recipient,
      ref: `AGENT-${from.code}-${to.code}`,
    });

    // 4. Try to settle it against opposing flow, right now.
    const outcome = await runCeloSolver();
    const didSettle = outcome.settled.length > 0;

    const reply = didSettle
      ? `Done. I matched your ${fmt(intent.amount)} ${from.code} against opposing ${to.code} flow and settled it peer-to-peer on Celo — no dollar in the path. ${to.flag} ${to.code} is on its way to the recipient.`
      : `I've placed your ${fmt(intent.amount)} ${from.code}→${to.code} intent on Celo. There's no one going the other way right now, so it's waiting to be matched — the moment someone sends ${to.code}→${from.code}, it settles automatically, no dollar involved.`;

    return {
      ok: true,
      understood: intent.summary,
      matched: didSettle,
      intent: { from: from.code, to: to.code, amount: intent.amount, recipient },
      submitTx,
      submitUrl: celoExplorerTx(submitTx),
      settlements: outcome.settled.map((s) => ({ ...s, url: celoExplorerTx(s.tx) })),
      reply,
      status: 200,
    };
  } catch (e) {
    return {
      ok: false,
      reply: e instanceof Error ? e.message.slice(0, 180) : "The settlement failed.",
      status: 500,
    };
  }
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
