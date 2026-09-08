// One-email-reward order payload construction.
//
// No cash/gift product catalog guessing: the reward is bound to the explicitly
// approved sandbox campaign supplied via configuration.

import type { SandboxConfig } from "./config.ts";
import { denominationFromMinorUnits, externalIdFor } from "./obligation.ts";
import type { RewardObligation } from "./types.ts";

export interface OrderPayload {
  external_id: string;
  payment: { funding_source_id: "BALANCE" };
  reward: {
    campaign_id: string;
    value: { denomination: number; currency_code: string };
    recipient: { name: string; email: string };
    delivery: { method: "EMAIL" };
  };
}

export function buildOrderPayload(obligation: RewardObligation, config: SandboxConfig): OrderPayload {
  return {
    external_id: externalIdFor(obligation),
    payment: { funding_source_id: config.fundingSourceId },
    reward: {
      campaign_id: config.campaignId,
      value: {
        denomination: denominationFromMinorUnits(obligation.amountMinorUnits),
        currency_code: obligation.currency,
      },
      recipient: { name: obligation.recipientName, email: obligation.recipientEmail },
      delivery: { method: "EMAIL" },
    },
  };
}
