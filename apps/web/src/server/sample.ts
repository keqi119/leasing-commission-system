import {
  calculateCommissionSettlement,
  type CommissionSettlementInput
} from "@lcs/commission-engine";

export const acceptanceScenarioInput: CommissionSettlementInput = {
  periodCode: "2026-04",
  departmentId: "leasing-sales",
  targetAmountCents: 51900000,
  revenueReceipts: [
    {
      id: "owned-a",
      salesUserId: "A",
      receiptAmountCents: 30000000,
      financeReviewStatus: "APPROVED",
      isCommissionable: true,
      revenueKind: "OWNED_RENT"
    },
    {
      id: "owned-b",
      salesUserId: "B",
      receiptAmountCents: 10000000,
      financeReviewStatus: "APPROVED",
      isCommissionable: true,
      revenueKind: "OWNED_RENT"
    },
    {
      id: "history-b",
      salesUserId: "B",
      receiptAmountCents: 3900000,
      financeReviewStatus: "APPROVED",
      isCommissionable: true,
      revenueKind: "HISTORICAL_RECEIVABLE"
    }
  ],
  externalProfitReceipts: [
    {
      id: "external-c",
      salesUserId: "C",
      profitAmountCents: 8000000,
      financeReviewStatus: "APPROVED",
      isCommissionable: true
    }
  ],
  deposits: [
    {
      id: "deposit-disputed",
      salesUserId: "B",
      depositAmountCents: 3000000,
      refundStatus: "DISPUTED"
    }
  ],
  targetAdjustments: [],
  tiers: [
    {
      id: "tier-70",
      minAchievementRateBps: 7000,
      maxAchievementRateBps: 8000,
      commissionRateBps: 300,
      sortOrder: 1
    },
    {
      id: "tier-80",
      minAchievementRateBps: 8000,
      maxAchievementRateBps: 9000,
      commissionRateBps: 500,
      sortOrder: 2
    },
    {
      id: "tier-90",
      minAchievementRateBps: 9000,
      maxAchievementRateBps: 10000,
      commissionRateBps: 700,
      sortOrder: 3
    },
    {
      id: "tier-100",
      minAchievementRateBps: 10000,
      maxAchievementRateBps: null,
      commissionRateBps: 1000,
      sortOrder: 4
    }
  ],
  payoutRules: [
    { payoutStage: "CURRENT", payoutRatioBps: 6000, sortOrder: 1 },
    { payoutStage: "QUARTERLY", payoutRatioBps: 2000, sortOrder: 2 },
    { payoutStage: "YEAR_END", payoutRatioBps: 2000, sortOrder: 3 }
  ],
  employees: [
    { userId: "A", name: "销售 A", roleInSettlement: "SALES" },
    { userId: "B", name: "销售 B", roleInSettlement: "SALES" },
    { userId: "C", name: "销售 C", roleInSettlement: "SALES" }
  ]
};

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

