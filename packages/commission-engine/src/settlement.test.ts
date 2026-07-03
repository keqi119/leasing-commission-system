import { describe, expect, test } from "vitest";
import {
  assertSettlementEditable,
  calculateAchievementRate,
  calculateCommissionSettlement,
  calculateContributionRates,
  calculateDepartmentCommissionPool,
  calculatePayoutBreakdown,
  canExportSettlement,
  matchCommissionTier
} from "./index";
import type {
  CommissionSettlementInput,
  CommissionTierRuleInput,
  PayoutRuleInput
} from "./types";

const tiers: CommissionTierRuleInput[] = [
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
];

const payoutRules: PayoutRuleInput[] = [
  { payoutStage: "CURRENT", payoutRatioBps: 6000, sortOrder: 1 },
  { payoutStage: "QUARTERLY", payoutRatioBps: 2000, sortOrder: 2 },
  { payoutStage: "YEAR_END", payoutRatioBps: 2000, sortOrder: 3 }
];

describe("commission calculation primitives", () => {
  test("calculates income achievement rate with integer bps", () => {
    expect(calculateAchievementRate(51900000, 51900000)).toBe(10000);
    expect(calculateAchievementRate(9500000, 10000000)).toBe(9500);
  });

  test("matches one tier and applies that rate to the full revenue amount", () => {
    const tier = matchCommissionTier(9500, tiers);
    expect(tier.id).toBe("tier-90");
    expect(tier.commissionRateBps).toBe(700);
    expect(calculateDepartmentCommissionPool(9500000, tier.commissionRateBps)).toBe(665000);
  });

  test("calculates personal contribution rates from approved contribution only", () => {
    const contributions = calculateContributionRates({
      A: 30000000,
      B: 13900000,
      C: 8000000
    });

    expect(contributions).toEqual([
      {
        userId: "A",
        contributionAmountCents: 30000000,
        confirmedContributionAmountCents: 30000000,
        contributionRateBps: 5780
      },
      {
        userId: "B",
        contributionAmountCents: 13900000,
        confirmedContributionAmountCents: 13900000,
        contributionRateBps: 2678
      },
      {
        userId: "C",
        contributionAmountCents: 8000000,
        confirmedContributionAmountCents: 8000000,
        contributionRateBps: 1541
      }
    ]);
  });

  test("splits payout into current and future payout amounts", () => {
    expect(calculatePayoutBreakdown(3000000, payoutRules)).toEqual({
      currentPayoutCents: 1800000,
      quarterlyDeferredCents: 600000,
      yearEndDeferredCents: 600000,
      otherDeferredCents: 0,
      futurePayoutCents: 1200000,
      frozenAmountCents: 0,
      adjustmentAmountCents: 0,
      finalCurrentPayableCents: 1800000
    });
  });
});

describe("commission settlement acceptance scenario", () => {
  const input: CommissionSettlementInput = {
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
        id: "unpaid-order",
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
        id: "external-rejected",
        salesUserId: "C",
        profitAmountCents: 2000000,
        financeReviewStatus: "REJECTED",
        isCommissionable: true
      }
    ],
    deposits: [
      {
        id: "deposit-held",
        salesUserId: "A",
        depositAmountCents: 5000000,
        refundStatus: "HELD"
      },
      {
        id: "deposit-disputed",
        salesUserId: "B",
        depositAmountCents: 3000000,
        refundStatus: "DISPUTED"
      }
    ],
    targetAdjustments: [
      {
        id: "pending-adjustment",
        status: "PENDING",
        originalTargetAmountCents: 51900000,
        adjustedTargetAmountCents: 40000000
      }
    ],
    tiers,
    payoutRules,
    employees: [
      { userId: "A", name: "销售 A", roleInSettlement: "SALES" },
      { userId: "B", name: "销售 B", roleInSettlement: "SALES" },
      { userId: "C", name: "销售 C", roleInSettlement: "SALES" }
    ]
  };

  test("uses approved rent, external profit, and historical recovery for April 2026", () => {
    const settlement = calculateCommissionSettlement(input);

    expect(settlement.targetAmountCents).toBe(51900000);
    expect(settlement.ownedVehicleRevenueAmountCents).toBe(40000000);
    expect(settlement.externalProfitAmountCents).toBe(8000000);
    expect(settlement.historicalReceivableRecoveredAmountCents).toBe(3900000);
    expect(settlement.confirmedRevenueAmountCents).toBe(51900000);
    expect(settlement.achievementRateBps).toBe(10000);
    expect(settlement.appliedCommissionRateBps).toBe(1000);
    expect(settlement.departmentCommissionPoolCents).toBe(5190000);
    expect(settlement.depositRiskCount).toBe(1);
  });

  test("calculates salesperson gross, current payout, and future payout from contribution", () => {
    const settlement = calculateCommissionSettlement(input);

    expect(settlement.lines).toMatchObject([
      {
        userId: "A",
        confirmedContributionAmountCents: 30000000,
        grossCommissionCents: 3000000,
        currentPayoutCents: 1800000,
        futurePayoutCents: 1200000
      },
      {
        userId: "B",
        confirmedContributionAmountCents: 13900000,
        grossCommissionCents: 1390000,
        currentPayoutCents: 834000,
        futurePayoutCents: 556000
      },
      {
        userId: "C",
        confirmedContributionAmountCents: 8000000,
        grossCommissionCents: 800000,
        currentPayoutCents: 480000,
        futurePayoutCents: 320000
      }
    ]);
  });

  test("applies only approved target adjustments to the department target", () => {
    const pendingOnly = calculateCommissionSettlement({
      ...input,
      targetAmountCents: 10000000,
      targetAdjustments: [
        {
          id: "pending",
          status: "PENDING",
          originalTargetAmountCents: 10000000,
          adjustedTargetAmountCents: 8000000
        }
      ]
    });
    const approved = calculateCommissionSettlement({
      ...input,
      targetAmountCents: 10000000,
      targetAdjustments: [
        {
          id: "approved",
          status: "APPROVED",
          originalTargetAmountCents: 10000000,
          adjustedTargetAmountCents: 12000000
        }
      ]
    });

    expect(pendingOnly.targetAmountCents).toBe(10000000);
    expect(approved.targetAmountCents).toBe(12000000);
  });
});

describe("settlement workflow guards", () => {
  test("locks approved settlements from direct mutation", () => {
    expect(() => assertSettlementEditable("APPROVED")).toThrow(
      "Approved settlements cannot be modified directly"
    );
    expect(() => assertSettlementEditable("CALCULATED")).not.toThrow();
  });

  test("allows formal export only after boss approval", () => {
    expect(canExportSettlement("CALCULATED")).toBe(false);
    expect(canExportSettlement("SUBMITTED")).toBe(false);
    expect(canExportSettlement("APPROVED")).toBe(true);
  });
});
