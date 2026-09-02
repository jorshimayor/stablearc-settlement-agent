// StableArc Settlement Agent — public API of the reusable core.
//
// This barrel is the whole framework-agnostic engine. Import from here in any
// surface (web, Telegram, MiniPay, or StableArc's own app) and you get the
// same settlement behaviour with zero transport assumptions.

// One-call entry point — understand → price → submit → settle → structured result.
export { runSettlementTurn, agentEnvReady, type TurnResult } from "./handle";

// The pieces, if you want to compose your own flow.
export { parseSettlementRequest, type ParsedIntent, type AgentReply } from "./agent";
export { extractTool, llmConfigured, type ToolSpec, type ToolCall } from "./llm";
export {
  submitIntent,
  runCeloSolver,
  agentAddress,
  type SettleOutcome,
} from "./solver";
export { findPlans, limitRate, type Intent, type RingPlan } from "./matching";
export { dataSuffix, withTag, hasAttributionTag } from "./attribution";
export {
  CELO,
  CELO_CHAIN,
  celoPublicClient,
  celoRpcUrl,
  celoExplorerTx,
  celoCurrencies,
  celoCurrencyByCode,
  celoAgentReady,
  type CeloCurrency,
} from "./celo";
export { intentMatcherAbi, realizedRateOracleAbi } from "./abi";
