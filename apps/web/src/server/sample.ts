import {
  acceptanceScenarioInput,
  calculateCommissionSettlement,
  type CommissionSettlementInput
} from "@lcs/commission-engine";

export { acceptanceScenarioInput };

export const acceptanceScenarioSettlement =
  calculateCommissionSettlement(acceptanceScenarioInput);

export function formatCny(cents: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY"
  }).format(cents / 100);
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export type { CommissionSettlementInput };
