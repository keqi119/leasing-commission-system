import { describe, expect, test } from "vitest";
import {
  assertSettlementEditable,
  calculateCommissionSettlement,
  canExportSettlement
} from "../../packages/commission-engine/src/index";
import {
  acceptanceApprovalMeta,
  acceptanceScenarioInput,
  expectedAcceptanceSummary
} from "../../packages/commission-engine/src/acceptance-fixture";

describe("LCS-P1-H02 acceptance calculation hardening", () => {
  test("keeps the 2026-04 main acceptance scenario stable", () => {
    const settlement = calculateCommissionSettlement(acceptanceScenarioInput);

    expect(settlement.periodCode).toBe("2026-04");
    expect(settlement.targetAmountCents).toBe(51900000);
    expect(settlement.ownedVehicleRevenueAmountCents).toBe(40000000);
    expect(settlement.externalProfitAmountCents).toBe(8000000);
    expect(settlement.historicalReceivableRecoveredAmountCents).toBe(3900000);
    expect(settlement.confirmedRevenueAmountCents).toBe(51900000);
    expect(settlement.achievementRateBps).toBe(10000);
    expect(settlement.appliedCommissionRateBps).toBe(1000);
    expect(settlement.departmentCommissionPoolCents).toBe(5190000);
    expect(settlement.lines.map((line) => [line.userId, line.confirmedContributionAmountCents])).toEqual([
      ["A", 30000000],
      ["B", 13900000],
      ["C", 8000000]
    ]);
  });

  test("includes external profit in achievement and salesperson contribution", () => {
    const settlement = calculateCommissionSettlement(acceptanceScenarioInput);
    const salesC = settlement.lines.find((line) => line.userId === "C");

    expect(settlement.externalProfitAmountCents).toBe(8000000);
    expect(salesC?.confirmedContributionAmountCents).toBe(8000000);
    expect(salesC?.grossCommissionCents).toBe(800000);
  });

  test("excludes deposits and unpaid receipts from revenue and commission", () => {
    const settlement = calculateCommissionSettlement(acceptanceScenarioInput);
    const totalGrossCommission = settlement.lines.reduce(
      (sum, line) => sum + line.grossCommissionCents,
      0
    );

    expect(settlement.confirmedRevenueAmountCents).toBe(51900000);
    expect(settlement.depositRiskCount).toBe(1);
    expect(totalGrossCommission).toBe(settlement.departmentCommissionPoolCents);
    expect(settlement.lines.find((line) => line.userId === "A")?.confirmedContributionAmountCents).toBe(30000000);
  });

  test("includes historical receivable recovered this month", () => {
    const settlement = calculateCommissionSettlement(acceptanceScenarioInput);
    const salesB = settlement.lines.find((line) => line.userId === "B");

    expect(settlement.historicalReceivableRecoveredAmountCents).toBe(3900000);
    expect(salesB?.confirmedContributionAmountCents).toBe(13900000);
  });

  test("ignores pending target adjustments and applies approved target adjustments", () => {
    const pendingOnly = calculateCommissionSettlement({
      ...acceptanceScenarioInput,
      targetAdjustments: [
        {
          id: "pending-lower-target",
          status: "PENDING",
          originalTargetAmountCents: 51900000,
          adjustedTargetAmountCents: 50000000
        }
      ]
    });
    const approved = calculateCommissionSettlement({
      ...acceptanceScenarioInput,
      targetAdjustments: [
        {
          id: "approved-lower-target",
          status: "APPROVED",
          originalTargetAmountCents: 51900000,
          adjustedTargetAmountCents: 50000000
        }
      ]
    });

    expect(pendingOnly.targetAmountCents).toBe(51900000);
    expect(approved.targetAmountCents).toBe(50000000);
    expect(approved.achievementRateBps).toBe(10380);
  });

  test("locks approved settlements and gates formal export by approval", () => {
    expect(() => assertSettlementEditable("APPROVED")).toThrow(
      "Approved settlements cannot be modified directly"
    );
    expect(canExportSettlement("SUBMITTED")).toBe(false);
    expect(canExportSettlement("APPROVED")).toBe(true);
    expect(acceptanceApprovalMeta.approvalStatus).toBe("APPROVED");
  });

  test("documents the expected summary used by seed, pages, APIs, and exports", () => {
    expect(expectedAcceptanceSummary).toEqual({
      periodCode: "2026-04",
      departmentName: "租赁销售部",
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
    });
  });
});
