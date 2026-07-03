import type {
  CommissionSettlementInput,
  CommissionTierRuleInput,
  ContributionRate,
  PayoutBreakdown,
  PayoutRuleInput,
  SettlementLineResult,
  SettlementSnapshotResult,
  SettlementStatus
} from "./types";

const BPS_DENOMINATOR = 10000n;

function roundRatioBps(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    throw new Error("Rate denominator must be greater than zero");
  }

  return Number(
    (BigInt(numerator) * BPS_DENOMINATOR + BigInt(Math.trunc(denominator / 2))) /
      BigInt(denominator)
  );
}

function multiplyCentsByBps(amountCents: number, bps: number): number {
  return Number((BigInt(amountCents) * BigInt(bps) + 5000n) / BPS_DENOMINATOR);
}

function sumAmounts(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

export function calculateAchievementRate(
  confirmedRevenueAmountCents: number,
  targetAmountCents: number
): number {
  return roundRatioBps(confirmedRevenueAmountCents, targetAmountCents);
}

export function matchCommissionTier(
  achievementRateBps: number,
  tiers: CommissionTierRuleInput[]
): CommissionTierRuleInput {
  const matchedTier = [...tiers]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .find((tier) => {
      const aboveMin = achievementRateBps >= tier.minAchievementRateBps;
      const belowMax =
        tier.maxAchievementRateBps === null ||
        achievementRateBps < tier.maxAchievementRateBps;

      return aboveMin && belowMax;
    });

  return (
    matchedTier ?? {
      id: "NO_TIER",
      minAchievementRateBps: 0,
      maxAchievementRateBps: null,
      commissionRateBps: 0,
      sortOrder: 0
    }
  );
}

export function calculateDepartmentCommissionPool(
  confirmedRevenueAmountCents: number,
  commissionRateBps: number
): number {
  return multiplyCentsByBps(confirmedRevenueAmountCents, commissionRateBps);
}

export function calculateContributionRates(
  contributionAmountByUserId: Record<string, number>
): ContributionRate[] {
  const totalContribution = sumAmounts(Object.values(contributionAmountByUserId));

  return Object.entries(contributionAmountByUserId)
    .filter(([, contributionAmountCents]) => contributionAmountCents > 0)
    .map(([userId, contributionAmountCents]) => ({
      userId,
      contributionAmountCents,
      confirmedContributionAmountCents: contributionAmountCents,
      contributionRateBps:
        totalContribution === 0
          ? 0
          : roundRatioBps(contributionAmountCents, totalContribution)
    }));
}

export function calculatePayoutBreakdown(
  grossCommissionCents: number,
  payoutRules: PayoutRuleInput[],
  frozenAmountCents = 0,
  adjustmentAmountCents = 0
): PayoutBreakdown {
  const ratioByStage = payoutRules.reduce<Record<string, number>>((acc, rule) => {
    acc[rule.payoutStage] = (acc[rule.payoutStage] ?? 0) + rule.payoutRatioBps;
    return acc;
  }, {});

  const currentPayoutCents = multiplyCentsByBps(
    grossCommissionCents,
    ratioByStage.CURRENT ?? 0
  );
  const quarterlyDeferredCents = multiplyCentsByBps(
    grossCommissionCents,
    ratioByStage.QUARTERLY ?? 0
  );
  const yearEndDeferredCents = multiplyCentsByBps(
    grossCommissionCents,
    ratioByStage.YEAR_END ?? 0
  );
  const otherDeferredCents = multiplyCentsByBps(
    grossCommissionCents,
    ratioByStage.OTHER ?? 0
  );

  return {
    currentPayoutCents,
    quarterlyDeferredCents,
    yearEndDeferredCents,
    otherDeferredCents,
    futurePayoutCents:
      grossCommissionCents -
      currentPayoutCents -
      frozenAmountCents +
      adjustmentAmountCents,
    frozenAmountCents,
    adjustmentAmountCents,
    finalCurrentPayableCents:
      currentPayoutCents + adjustmentAmountCents - frozenAmountCents
  };
}

export function calculateCommissionSettlement(
  input: CommissionSettlementInput
): SettlementSnapshotResult {
  const targetAmountCents = applyApprovedTargetAdjustments(
    input.targetAmountCents,
    input.targetAdjustments
  );
  const approvedRevenueReceipts = input.revenueReceipts.filter(
    (receipt) =>
      receipt.financeReviewStatus === "APPROVED" && receipt.isCommissionable
  );
  const approvedExternalProfitReceipts = input.externalProfitReceipts.filter(
    (receipt) =>
      receipt.financeReviewStatus === "APPROVED" && receipt.isCommissionable
  );
  const ownedVehicleRevenueAmountCents = sumAmounts(
    approvedRevenueReceipts
      .filter((receipt) => receipt.revenueKind === "OWNED_RENT")
      .map((receipt) => receipt.receiptAmountCents)
  );
  const historicalReceivableRecoveredAmountCents = sumAmounts(
    approvedRevenueReceipts
      .filter((receipt) => receipt.revenueKind === "HISTORICAL_RECEIVABLE")
      .map((receipt) => receipt.receiptAmountCents)
  );
  const externalProfitAmountCents = sumAmounts(
    approvedExternalProfitReceipts.map((receipt) => receipt.profitAmountCents)
  );
  const confirmedRevenueAmountCents =
    ownedVehicleRevenueAmountCents +
    historicalReceivableRecoveredAmountCents +
    externalProfitAmountCents;
  const achievementRateBps = calculateAchievementRate(
    confirmedRevenueAmountCents,
    targetAmountCents
  );
  const appliedTier = matchCommissionTier(achievementRateBps, input.tiers);
  const departmentCommissionPoolCents = calculateDepartmentCommissionPool(
    confirmedRevenueAmountCents,
    appliedTier.commissionRateBps
  );
  const contributionAmountByUserId = buildContributionMap(
    approvedRevenueReceipts,
    approvedExternalProfitReceipts
  );
  const contributions = calculateContributionRates(contributionAmountByUserId);
  const grossCommissionByUserId = allocatePoolByContribution(
    departmentCommissionPoolCents,
    contributions
  );
  const lines = contributions.map<SettlementLineResult>((contribution) => {
    const employee = input.employees.find(
      (candidate) => candidate.userId === contribution.userId
    );
    const grossCommissionCents =
      grossCommissionByUserId[contribution.userId] ?? 0;
    const payout = calculatePayoutBreakdown(
      grossCommissionCents,
      input.payoutRules,
      input.frozenAmountByUserId?.[contribution.userId] ?? 0,
      input.adjustmentAmountByUserId?.[contribution.userId] ?? 0
    );

    return {
      ...contribution,
      employeeName: employee?.name ?? contribution.userId,
      roleInSettlement: employee?.roleInSettlement ?? "SALES",
      grossCommissionCents,
      ...payout,
      remark: buildLineRemark(contribution.confirmedContributionAmountCents)
    };
  });

  return {
    periodCode: input.periodCode,
    departmentId: input.departmentId,
    targetAmountCents,
    confirmedRevenueAmountCents,
    ownedVehicleRevenueAmountCents,
    externalProfitAmountCents,
    historicalReceivableRecoveredAmountCents,
    achievementRateBps,
    appliedCommissionRateBps: appliedTier.commissionRateBps,
    departmentCommissionPoolCents,
    depositRiskCount: input.deposits.filter(
      (deposit) => deposit.refundStatus === "DISPUTED"
    ).length,
    lines
  };
}

export function assertSettlementEditable(status: SettlementStatus): void {
  if (["APPROVED", "EXPORTED", "CLOSED"].includes(status)) {
    throw new Error("Approved settlements cannot be modified directly");
  }
}

export function canExportSettlement(status: SettlementStatus): boolean {
  return status === "APPROVED" || status === "EXPORTED";
}

function applyApprovedTargetAdjustments(
  baseTargetAmountCents: number,
  targetAdjustments: CommissionSettlementInput["targetAdjustments"]
): number {
  return targetAdjustments.reduce((targetAmountCents, adjustment) => {
    if (adjustment.status !== "APPROVED") {
      return targetAmountCents;
    }

    return (
      targetAmountCents -
      adjustment.originalTargetAmountCents +
      adjustment.adjustedTargetAmountCents
    );
  }, baseTargetAmountCents);
}

function buildContributionMap(
  revenueReceipts: CommissionSettlementInput["revenueReceipts"],
  externalProfitReceipts: CommissionSettlementInput["externalProfitReceipts"]
): Record<string, number> {
  const contributionAmountByUserId: Record<string, number> = {};

  for (const receipt of revenueReceipts) {
    contributionAmountByUserId[receipt.salesUserId] =
      (contributionAmountByUserId[receipt.salesUserId] ?? 0) +
      receipt.receiptAmountCents;
  }

  for (const receipt of externalProfitReceipts) {
    contributionAmountByUserId[receipt.salesUserId] =
      (contributionAmountByUserId[receipt.salesUserId] ?? 0) +
      receipt.profitAmountCents;
  }

  return contributionAmountByUserId;
}

function allocatePoolByContribution(
  departmentCommissionPoolCents: number,
  contributions: ContributionRate[]
): Record<string, number> {
  const totalContributionCents = sumAmounts(
    contributions.map(
      (contribution) => contribution.confirmedContributionAmountCents
    )
  );

  if (totalContributionCents === 0) {
    return {};
  }

  const allocations = contributions.map((contribution, index) => {
    const numerator =
      BigInt(departmentCommissionPoolCents) *
      BigInt(contribution.confirmedContributionAmountCents);
    const denominator = BigInt(totalContributionCents);

    return {
      userId: contribution.userId,
      index,
      floorCents: Number(numerator / denominator),
      remainder: numerator % denominator
    };
  });
  const floorTotal = sumAmounts(
    allocations.map((allocation) => allocation.floorCents)
  );
  let centsToDistribute = departmentCommissionPoolCents - floorTotal;
  const sortedByRemainder = [...allocations].sort((left, right) => {
    if (left.remainder === right.remainder) {
      return left.index - right.index;
    }

    return left.remainder > right.remainder ? -1 : 1;
  });
  const grossCommissionByUserId: Record<string, number> = {};

  for (const allocation of allocations) {
    grossCommissionByUserId[allocation.userId] = allocation.floorCents;
  }

  for (const allocation of sortedByRemainder) {
    if (centsToDistribute <= 0) {
      break;
    }

    grossCommissionByUserId[allocation.userId] += 1;
    centsToDistribute -= 1;
  }

  return grossCommissionByUserId;
}

function buildLineRemark(confirmedContributionAmountCents: number): string {
  return `Based on approved commissionable contribution ${confirmedContributionAmountCents} cents`;
}

export type * from "./types";

