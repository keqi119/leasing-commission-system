import { describe, expect, test } from "vitest";
import {
  buildTrialRunCheckReport,
  createDefaultImportContext
} from "../../apps/web/src/server/imports";

describe("LCS-P1-H03 trial-run check report", () => {
  test("summarizes imported trial data before HR settlement calculation", () => {
    const report = buildTrialRunCheckReport(createDefaultImportContext(), "2026-04");

    expect(report).toMatchObject({
      periodCode: "2026-04",
      departmentTargetCents: 51900000,
      orderReceivableCents: 49990000,
      approvedRentRevenueCents: 40000000,
      approvedExternalProfitCents: 8000000,
      historicalRecoveredCents: 3900000,
      depositTotalCents: 8000000,
      abnormalDepositCount: 1,
      unpaidOrderCount: 1,
      pendingRevenueCount: 1,
      commissionableRevenueCents: 51900000,
      achievementRateBps: 10000,
      estimatedCommissionPoolCents: 5190000,
      canStartHrCalculation: false
    });
    expect(report.blockingReasons).toContain("存在未审核收入，财务需先处理后再试算");
    expect(report.warnings).toContain("存在异常押金，HR 结算前需确认风险归属");
  });
});