import { describe, expect, test } from "vitest";
import { buildSettlementDisplayRows } from "../../apps/web/src/server/settlement-presenter";
import {
  approveAdjustment,
  createAdjustment,
  createTrialRunWorkflowStore,
  recalculateSettlementRun,
  submitAdjustment
} from "../../apps/web/src/server/trial-run-workflow";

describe("LCS-P1-H04 commission adjustments", () => {
  test("keeps manual adjustments out before approval and applies them to a new run after approval", () => {
    const store = createTrialRunWorkflowStore();
    const originalRevenueCount = store.importContext.revenueReceipts.length;
    const runV1 = recalculateSettlementRun(store, { periodCode: "2026-04", calculatedBy: "hr-1" });
    const lineBefore = runV1.snapshot.lines.find((line) => line.userId === "A")!;

    const adjustment = createAdjustment(store, {
      periodCode: "2026-04",
      userId: "A",
      adjustmentType: "SPECIAL_REWARD",
      amountCents: 50000,
      direction: "ADD",
      reason: "老板确认试运行专项奖励",
      requestedBy: "hr-1"
    });

    submitAdjustment(store, adjustment.id, { submittedBy: "hr-1" });
    const runWithoutApprovedAdjustment = recalculateSettlementRun(store, {
      periodCode: "2026-04",
      calculatedBy: "hr-1"
    });

    expect(runWithoutApprovedAdjustment.snapshot.lines.find((line) => line.userId === "A")?.adjustmentAmountCents).toBe(0);

    approveAdjustment(store, adjustment.id, {
      approvedBy: "boss-1",
      approvedAt: "2026-05-05T08:00:00.000Z"
    });
    const runWithAdjustment = recalculateSettlementRun(store, {
      periodCode: "2026-04",
      calculatedBy: "hr-1"
    });
    const lineAfter = runWithAdjustment.snapshot.lines.find((line) => line.userId === "A")!;

    expect(lineAfter.adjustmentAmountCents).toBe(50000);
    expect(lineAfter.finalCurrentPayableCents).toBe(lineBefore.finalCurrentPayableCents + 50000);
    expect(store.importContext.revenueReceipts).toHaveLength(originalRevenueCount);
    expect(store.adjustments[0]).toMatchObject({
      status: "APPLIED",
      appliedRunId: runWithAdjustment.id
    });

    const exportRows = buildSettlementDisplayRows(runWithAdjustment.snapshot, {
      approvalStatus: "APPROVED",
      approvedBy: "boss-1",
      approvedAt: "2026-05-05T08:00:00.000Z",
      departmentName: "租赁销售部",
      adjustmentReasonsByUserId: {
        A: [adjustment.reason]
      }
    });
    expect(exportRows.find((row) => row.employeeName === "销售 A")?.remark).toContain("老板确认试运行专项奖励");
  });
});
