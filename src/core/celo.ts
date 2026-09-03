// Celo settlement config.
//
// The local-currency settlement stack (IntentMatcher + RealizedRateOracle) on
// Celo, where cNGN/cKES/cGHS/cUSD are native and gas is payable in stablecoins.
// The contracts are chain-agnostic; only addresses + RPC change between chains
// — which is exactly why this same engine drops into StableArc's other spokes.

import { createPublicClient, http, type Chain } from "viem";
import { celo, celoSepolia } from "viem/chains";

/**
 * The active Celo chain, chosen by env at call time (lazy — so it's correct for
 * non-Next consumers that load .env after importing this module). Set
 * NEXT_PUBLIC_CELO_CHAIN_ID=42220 for Celo mainnet; anything else (or unset) is
 * Celo Sepolia testnet. The hackathon scores mainnet only.
 */
export function celoChain(): Chain {
  return Number(process.env.NEXT_PUBLIC_CELO_CHAIN_ID) === 42220 ? celo : celoSepolia;
}

/** Back-compat alias; prefer celoChain(). */
export const CELO_CHAIN: Chain = celoSepolia;

export function celoRpcUrl(): string {
  return process.env.NEXT_PUBLIC_CELO_RPC_URL || celoChain().rpcUrls.default.http[0];
}

export function celoPublicClient() {
  return createPublicClient({ chain: celoChain(), transport: http(celoRpcUrl()) });
}

export function celoExplorerTx(hash: string): string {
  const fallback = celoChain().id === 42220
    ? "https://celoscan.io"
    : "https://celo-sepolia.blockscout.com";
  const base = (celoChain().blockExplorers?.default.url ?? fallback).replace(/\/$/, "");
  return `${base}/tx/${hash}`;
}

// Lazy getters so the addresses are read from the environment on access, not at
// module-load time. This keeps `CELO.intentMatcher` working regardless of when
// .env is loaded relative to this import — essential for non-Next consumers (the
// Telegram bot, or StableArc's app) that populate env after importing core.
export const CELO = {
  get intentMatcher(): `0x${string}` | "" {
    return (process.env.NEXT_PUBLIC_CELO_INTENT_MATCHER as `0x${string}`) || "";
  },
  get realizedOracle(): `0x${string}` | "" {
    return (process.env.NEXT_PUBLIC_CELO_REALIZED_ORACLE as `0x${string}`) || "";
  },
};

export type CeloCurrency = {
  code: string;
  name: string;
  flag: string;
  symbol: string;
  address: `0x${string}`;
};

/** Local stables the agent can move on Celo. */
export function celoCurrencies(): CeloCurrency[] {
  const defs: Array<[string, string, string, string, string | undefined]> = [
    ["NGN", "Nigerian Naira", "🇳🇬", "₦", process.env.NEXT_PUBLIC_CELO_TOKEN_NGN],
    ["GHS", "Ghanaian Cedi", "🇬🇭", "₵", process.env.NEXT_PUBLIC_CELO_TOKEN_GHS],
    ["KES", "Kenyan Shilling", "🇰🇪", "KSh", process.env.NEXT_PUBLIC_CELO_TOKEN_KES],
  ];
  return defs
    .filter(([, , , , addr]) => Boolean(addr))
    .map(([code, name, flag, symbol, addr]) => ({
      code,
      name,
      flag,
      symbol,
      address: addr as `0x${string}`,
    }));
}

export function celoCurrencyByCode(code: string): CeloCurrency | undefined {
  return celoCurrencies().find((c) => c.code.toUpperCase() === code.toUpperCase());
}

/**
 * Bootstrap cross-rates (units of TO per 1 FROM) used only until the
 * RealizedRateOracle has a print for a corridor — after that, price comes from
 * our own settled flow. Kept internally consistent so a ring's rates multiply
 * to ~1 (NGN→GHS→KES→NGN = 0.01 × 5 × 20 = 1.0), which is what lets local-only
 * rings clear with no external liquidity. Demo values, not a live FX feed.
 */
const BOOTSTRAP_RATES: Record<string, number> = {
  "NGN->GHS": 0.01,
  "GHS->NGN": 100,
  "GHS->KES": 5,
  "KES->GHS": 0.2,
  "NGN->KES": 0.05,
  "KES->NGN": 20,
};

/** TO-per-FROM bootstrap rate for a corridor, or undefined if unknown. */
export function bootstrapRate(fromCode: string, toCode: string): number | undefined {
  return BOOTSTRAP_RATES[`${fromCode.toUpperCase()}->${toCode.toUpperCase()}`];
}

export function celoAgentReady(): boolean {
  return Boolean(CELO.intentMatcher) && celoCurrencies().length >= 2;
}
