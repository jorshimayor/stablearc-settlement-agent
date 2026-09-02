// Telegram distribution surface for the StableArc settlement agent.
//
// This is a *thin adapter*: it owns nothing but the chat transport. Every
// message goes straight to runSettlementTurn() — the exact same core the web
// app and MiniPay use — so the agent behaves identically everywhere and there
// is one place to improve it. When StableArc launches globally, this same file
// is the Telegram channel; swap the token and it's live.
//
//   TELEGRAM_BOT_TOKEN=…   (from @BotFather)
//   plus the same LLM_* / CELO_* / CELO_AGENT_PK env the agent needs.
//
// Run:  pnpm bot   (tsx adapters/telegram/bot.ts)

import { readFileSync } from "node:fs";
import { Bot } from "grammy";
import { runSettlementTurn, agentEnvReady } from "../../src/core";

// Load .env for a standalone (non-Next) process, without a dependency.
// Handles quoted values and strips inline "# comments" like dotenv does.
function parseEnvValue(raw: string): string {
  const v = raw.trim();
  if (v.startsWith('"') || v.startsWith("'")) {
    const q = v[0];
    const end = v.indexOf(q, 1);
    return end > 0 ? v.slice(1, end) : v.slice(1);
  }
  const hash = v.indexOf(" #");
  return (hash >= 0 ? v.slice(0, hash) : v).trim();
}
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    if (/^\s*#/.test(line)) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = parseEnvValue(m[2]);
  }
} catch {
  /* no .env file — rely on the ambient environment */
}

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Set TELEGRAM_BOT_TOKEN (get one from @BotFather).");
  process.exit(1);
}

const env = agentEnvReady();
if (!env.ready) {
  console.error(`Agent not ready: ${env.reason}`);
  process.exit(1);
}

const bot = new Bot(token);

const HELP =
  "I'm StableArc's settlement agent on Celo. Tell me what to send between " +
  "naira, cedis and shillings and I'll settle it peer-to-peer in local " +
  "currency — no US dollar in the path.\n\n" +
  "Try: “send 50,000 naira to Ghana”.";

bot.command("start", (ctx) => ctx.reply(HELP));
bot.command("help", (ctx) => ctx.reply(HELP));

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();
  if (!text) return;

  await ctx.replyWithChatAction("typing");
  let result;
  try {
    result = await runSettlementTurn(text);
  } catch (e) {
    await ctx.reply(e instanceof Error ? e.message.slice(0, 180) : "Something went wrong.");
    return;
  }

  // Reuse the same human reply the web app shows, then attach proof links.
  const lines = [result.reply];
  if (result.ok) {
    lines.push("", `🔗 Intent on-chain: ${result.submitUrl}`);
    for (const s of result.settlements) {
      lines.push(`✅ Settlement (${s.kind}): ${s.url}`);
    }
  }
  await ctx.reply(lines.join("\n"), { link_preview_options: { is_disabled: true } });
});

bot.catch((err) => console.error("bot error:", err.error));

console.log("StableArc settlement bot is running. Press Ctrl+C to stop.");
bot.start();
