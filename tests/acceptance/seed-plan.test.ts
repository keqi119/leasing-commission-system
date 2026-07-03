import { describe, expect, test } from "vitest";
import { buildAcceptanceSeedPlan } from "../../packages/database/prisma/seed.acceptance";

describe("LCS-P1-H02 acceptance seed plan", () => {
  test("contains stable acceptance data and counterexamples", () => {
    const plan = buildAcceptanceSeedPlan();

    expect(plan.period.periodCode).toBe("2026-04");
    expect(plan.targets.departmentTarget.targetAmountCents).toBe(51900000);
    expect(plan.summary.departmentCommissionPoolCents).toBe(5190000);
    expect(plan.revenueReceipts.approvedOwnedRentTotalCents).toBe(40000000);
    expect(plan.externalProfit.approvedProfitCents).toBe(8000000);
    expect(plan.revenueReceipts.historicalRecoveredCents).toBe(3900000);
    expect(plan.counterexamples.unpaidOrder.participatesInCommission).toBe(false);
    expect(plan.counterexamples.deposit.participatesInCommission).toBe(false);
    expect(plan.counterexamples.pendingTargetAdjustment.affectsTarget).toBe(false);
    expect(plan.counterexamples.approvedTargetAdjustment.affectsTarget).toBe(true);
    expect(plan.counterexamples.externalOrderBasis).toBe("PROFIT_RECEIPT_ONLY");
  });
});
