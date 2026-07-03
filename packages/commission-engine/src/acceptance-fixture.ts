import type { CommissionSettlementInput } from "./types";

export const acceptanceDepartmentName = "租赁销售部";

export const acceptanceApprovalMeta = {
  approvalStatus: "APPROVED",
  approvedBy: "老板",
  approvedAt: "2026-05-06T09:00:00.000Z",
  departmentName: acceptanceDepartmentName
} as const;

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
    },
    {
      id: "unpaid-a",
      salesUserId: "A",
      receiptAmountCents: 9990000,
      financeReviewStatus: "PENDING",
      isCommissionable: true,
      revenueKind: "OWNED_RENT"
    }
  ],
  externalProfitReceipts: [
    {
      id: "external-c",
      salesUserId: "C",
      profitAmountCents: 8000000,
      financeReviewStatus: "APPROVED",
      isCommissionable: true
    },
    {
      id: "external-pending-c",
      salesUserId: "C",
      profitAmountCents: 2000000,
      financeReviewStatus: "PENDING",
      isCommissionable: true
    }
  ],
  deposits: [
    {
      id: "deposit-held-a",
      salesUserId: "A",
      depositAmountCents: 5000000,
      refundStatus: "HELD"
    },
    {
      id: "deposit-disputed-b",
      salesUserId: "B",
      depositAmountCents: 3000000,
      refundStatus: "DISPUTED"
    }
  ],
  targetAdjustments: [
    {
      id: "pending-target-adjustment",
      status: "PENDING",
      originalTargetAmountCents: 51900000,
      adjustedTargetAmountCents: 50000000
    }
  ],
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

export const expectedAcceptanceSummary = {
  periodCode: "2026-04",
  departmentName: acceptanceDepartmentName,
  targetAmountCents: 51900000,
  confirmedRevenueAmountCents: 51900000,
  achievementRateBps: 10000,
  appliedCommissionRateBps: 1000,
  departmentCommissionPoolCents: 5190000,
  salesContributionCents: {
    A: 30000000,
    B: 13900000,
    C: 8000000
  }
} as const;

