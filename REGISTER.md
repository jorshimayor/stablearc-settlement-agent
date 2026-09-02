# Hackathon eligibility checklist — do these on day one

Being _thematically_ strong isn't enough to place. These are the **mechanical**
requirements that decide whether the agent is even scored. Do them **before the
first on-chain transaction** — some can't be backfilled.

## Must-do (gates eligibility)

- [ ] **Public repo.** This repo must be public and resolve at judging time.
      (Entries have been disqualified for a 404 repo.) This is the whole reason
      it's carved out separately from the private StableArc product.
- [ ] **Register for an ERC-8004 Agent ID + Celo Builders attribution tag.**
      On day one:
      ```bash
      npx skills add https://celobuilders.xyz
      ```
      Follow it to register; you get an attribution tag back (`celo_…`).
- [ ] **Wire the tag before the first tx.** Put it in `.env`:
      ```
      NEXT_PUBLIC_CELO_ATTRIBUTION_TAG=celo_…
      ```
      The plumbing is already built (`src/core/attribution.ts` appends it to
      every agent transaction's calldata). **It cannot be backfilled** — a
      transaction sent without the tag scores zero, permanently.
- [ ] **Tweet** announcing the agent, tagging **@CeloDevs** and **@Celo**, with
      your ERC-8004 registration link.
- [ ] **Submit** before the deadline (verify the current date/time in the
      official brief).

## Tracks to enter

| Track | Why we fit |
|---|---|
| **Value Moved** (primary) | The solver moves value on every settlement. |
| **Best Stablecoin Adoption** (secondary) | Settles native-style cNGN↔cGHS↔cKES. |
| **Judges' Favorite** | The "no dollar in the path" hook is memorable. |

Our narrow, concrete job — _settle one cross-border payment in local currency_ —
is exactly what the brief rewards; it notes no general-purpose agent placed in
the top tier.

## Strongly advised (what top projects had)

- [ ] **Owned distribution.** A standalone web app is the weak spot. Ship the
      **Telegram bot** (already built — `pnpm bot`) and/or open the web app
      inside **MiniPay**. This is the single highest-leverage improvement.
- [ ] Optional partner tooling: **Chainstack** RPC (coupon in the brief) for
      sustained traffic; **Cencori** as the `LLM_BASE_URL` provider.

## Verify against the live brief

Deadlines, prize splits, partners, and the exact leaderboard queries are all in
the official Notion brief — confirm them there before submitting, as details can
change. This checklist is the shape of the work, not a substitute for the brief.
