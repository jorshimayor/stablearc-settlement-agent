# StableArc Settlement Agent

**An AI agent that moves African local money peer-to-peer — with no US dollar in the path.**

Tell it, in plain language, _"send 50,000 naira to Ghana."_ It understands the
request, turns it into an on-chain settlement **intent**, and an autonomous
solver matches it against opposing flow (or a ring) and settles it directly in
local currency on Celo — **cNGN ↔ cGHS ↔ cKES, zero dollars.**

Built for the Celo **"Agents at Work"** hackathon. Model-agnostic, on-chain,
and structured so the exact same engine ships to Telegram, MiniPay, and
StableArc's own app.

> Every other agent-payment demo moves dollars faster. This is the only one that
> moves African money **without** the dollar — and proves it on-chain.

---

## How it works

```
"send 50k naira to Ghana"
        │
        ▼
  model-agnostic LLM parse     src/core/llm.ts   (Cencori / OpenAI / Anthropic / Ollama …)
        │  → { NGN → GHS, 50000, recipient }
        ▼
  submit intent on Celo        src/core/solver.ts → IntentMatcher.submitIntent
        │  (calldata carries the ERC-8021 attribution tag, so it's leaderboard-counted)
        ▼
  autonomous solve             findPlans() → matchIntents / matchRing
        │  (matches opposing cGHS→cNGN flow, or a ring — no pool, no bridge)
        ▼
  settled in local currency    RealizedRateOracle records the price print
  — no USD, proof on-chain
```

Two contracts do the work, and neither has any bridge / AMM / external-oracle
dependency — which is why the same engine is chain-portable:

- **`IntentMatcher.sol`** — escrowed intents that settle **directly against
  opposing intents** in local currency (2-party pairs or closed rings). The
  solver can only propose pairings the makers' own limits already allow; it can
  never redirect funds or settle worse than asked.
- **`RealizedRateOracle.sol`** — **self-referential** price discovery: the rate
  comes from our own settled local-to-local flow, not a USD-referenced feed. No
  external provider can deny it and no jurisdiction can compel it.

## Reusable by design

The whole settlement engine lives in [`src/core/`](src/core) as a
**framework-agnostic library** with one entry point:

```ts
import { runSettlementTurn } from "@/src/core";

const result = await runSettlementTurn("send 50,000 naira to Ghana");
// → understand → price → submit on-chain → settle → { reply, submitUrl, settlements }
```

Every surface is a thin adapter over that one function, so the agent behaves
identically everywhere and there's a single place to improve it:

| Surface | Adapter | Status |
|---|---|---|
| Web app | [`app/api/agent/route.ts`](app/api/agent/route.ts) + [`components/AgentChat.tsx`](components/AgentChat.tsx) | ✅ built |
| Telegram bot | [`adapters/telegram/bot.ts`](adapters/telegram/bot.ts) | ✅ built (add `TELEGRAM_BOT_TOKEN`) |
| MiniPay | the same web route, opened in the MiniPay in-app browser | ✅ works as a web view |
| StableArc app (global launch) | `import { runSettlementTurn }` | ✅ same core |

This is the distribution layer StableArc reuses when it launches worldwide —
the hackathon build and the production channel are the same code.

---

## Run it

**Prereqs:** [Foundry](https://book.getfoundry.sh/), Node 18+, pnpm, a Celo
Sepolia key with test CELO for gas, and an LLM key (Cencori / OpenAI / …).

```bash
# 1. Install
pnpm install
cd contracts && forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts --no-commit && cd ..

# 2. Deploy the local-currency stack to Celo Sepolia
cd contracts
PRIVATE_KEY=0x… NEXT_PUBLIC_CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org \
  forge script script/Deploy.s.sol --rpc-url celo_sepolia --broadcast
#   → prints NEXT_PUBLIC_CELO_* addresses
cd ..

# 3. Configure
cp .env.example .env
#   paste the printed addresses + your LLM_* keys + CELO_AGENT_PK
#   + NEXT_PUBLIC_CELO_ATTRIBUTION_TAG (see REGISTER.md — required to be counted)

# 4. Seed opposing liquidity so a solo demo always has a counterparty
pnpm seed

# 5a. Web
pnpm dev            # open http://localhost:3000

# 5b. Telegram (optional)
pnpm bot            # needs TELEGRAM_BOT_TOKEN from @BotFather
```

Then say **"send 50,000 naira to Ghana"** → understood → intent placed (tag in
calldata) → matched against the seeded cGHS→cNGN flow → on-chain proof,
_"matched peer-to-peer · zero USD."_

### Model providers

| Env | Purpose |
|---|---|
| `LLM_PROVIDER` | `openai` \| `anthropic` (default: auto-detect) |
| `LLM_BASE_URL` | any OpenAI-compatible endpoint (Cencori, OpenAI, Groq, Ollama…) |
| `LLM_API_KEY` | key for the chosen provider |
| `LLM_MODEL` | model id |

"All agent frameworks allowed" — this uses a thin, dependency-free
OpenAI-compatible client so any model works, including the Cencori partner.

---

## Hackathon eligibility

The mechanical steps required to be **counted and scored** (public repo,
ERC-8004 registration, attribution tag, the tweet) are tracked in
[`REGISTER.md`](REGISTER.md). The attribution-tag plumbing is already built
([`src/core/attribution.ts`](src/core/attribution.ts)); you only need to drop
the assigned tag into `.env` **before your first transaction** — it can't be
backfilled.

## Honest scope

- **Testnet, test stables.** Open-mint test cNGN/cGHS/cKES on Celo Sepolia. On
  mainnet these become Celo's real native stables; the agent code is unchanged.
- **The agent is custodial for the demo** (it holds a key and acts). Production
  moves signing to the user's wallet; the matcher is already non-custodial and
  can never redirect funds or breach a maker's limit.
- **Liquidity seeding** exists only so a solo demo always has a counterparty; in
  the real network the counterparty is another user going the other way.

## License

MIT — see [LICENSE](LICENSE).
