import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { getSqliteClient } from "@lcs/database";
import { seedAcceptance } from "../../packages/database/prisma/seed.acceptance";
import { DbWorkflowError } from "../../apps/web/src/server/db-workflow-errors";
import {
  approveCommissionAdjustment,
  approvePeriodReopenRequest,
  approveSettlementRun,
  buildTrialRunCheckReportFromDb,
  createCommissionAdjustment,
  createPeriodReopenRequest,
  createTrialRun,
  createTrialRunIssue,
  exportApprovedSettlementRun,
  generateTrialRunReport,
  getTrialRun,
  listExportBindings,
  listSettlementRuns,
  listTrialRuns,
  recalculateSettlementRun,
  rejectSettlementRun,
  resolveTrialRunIssue,
  seedRealPeriodFixtureForTest,
  submitCommissionAdjustment,
  submitSettlementRun,
  updateTrialRunIssueStatus
} from "../../apps/web/src/server/trial-run-db-workflow";

describe("LCS-P1-H05 real-period persisted workflow", () => {
  beforeAll(async () => {
    await seedAcceptance();
  });

  beforeEach(async () => {
    await seedRealPeriodFixtureForTest();
  });

  test("creates a real trial run and persists issue lifecycle", async () => {
    const check = await buildTrialRunCheckReportFromDb("2026-05");
    expect(check).toMatchObject({
      periodCode: "2026-05",
      departmentName: "Direct Leasing",
      departmentTargetCents: 45000000,
      commissionableRevenueCents: 45000000,
      achievementRateBps: 10000,
      estimatedCommissionPoolCents: 4500000,
      importBatchCount: 8,
      employeeCount: 7,
      vehicleCount: 3,
      orderCount: 4,
      revenueReceiptCount: 4,
      externalProfitReceiptCount: 1,
      depositCount: 2,
      vehicleStatusEventCount: 1,
      unapprovedRevenueCents: 3200000,
      externalProfitTotalCents: 8000000,
      pendingTargetAdjustmentCount: 1,
      approvedTargetAdjustmentCount: 0
    });
    expect(check?.issueSuggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "BLOCKER", category: "REVENUE", ownerRole: "FINANCE" }),
        expect.objectContaining({ severity: "MAJOR", category: "DEPOSIT", ownerRole: "SALES" }),
        expect.objectContaining({ severity: "MAJOR", category: "TARGET", ownerRole: "ASSET_MANAGER" })
      ])
    );

    const trialRun = await createTrialRun({
      periodCode: "2026-05",
      name: "2026-05 first real-period trial run",
      startedBy: "real-hr"
    });

    expect(trialRun).toMatchObject({
      periodCode: "2026-05",
      departmentId: "real-dept-direct",
      status: "IN_PROGRESS"
    });
    await expect(listTrialRuns()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ id: trialRun.id })]));

    const issue = await createTrialRunIssue({
      trialRunId: trialRun.id,
      severity: "BLOCKER",
      category: "REVENUE",
      title: "Finance review is incomplete",
      description: "A blocker issue should stop HR from submitting approval.",
      ownerRole: "FINANCE",
      createdBy: "real-hr"
    });

    await updateTrialRunIssueStatus(issue.id, { status: "FIXING", operatorId: "real-finance" });
    const resolved = await resolveTrialRunIssue(issue.id, {
      resolvedBy: "real-finance",
      resolution: "Revenue has been reviewed and confirmed."
    });
    const detail = await getTrialRun(trialRun.id);

    expect(resolved.status).toBe("RESOLVED");
    expect(detail?.issues).toEqual(expect.arrayContaining([expect.objectContaining({ id: issue.id, status: "RESOLVED" })]));
  });

  test("keeps rejected runs, recalculates new runs, applies approved adjustments, binds exports, and generates report", async () => {
    const trialRun = await createTrialRun({
      periodCode: "2026-05",
      name: "2026-05 approval-loop trial run",
      startedBy: "real-hr"
    });
    const blocker = await createTrialRunIssue({
      trialRunId: trialRun.id,
      severity: "BLOCKER",
      category: "SETTLEMENT",
      title: "Blocking settlement check",
      description: "Open blocker should prevent HR submission.",
      ownerRole: "HR",
      createdBy: "real-hr"
    });
    const runV1 = await recalculateSettlementRun({ periodCode: "2026-05", calculatedBy: "real-hr" });

    await expect(submitSettlementRun(runV1.id, { submittedBy: "real-hr" })).rejects.toMatchObject({
      code: "OPEN_BLOCKER_ISSUES",
      context: { blockerCount: 1 }
    } satisfies Partial<DbWorkflowError>);
    await resolveTrialRunIssue(blocker.id, { resolvedBy: "real-hr", resolution: "Blocker resolved." });

    const pendingAdjustment = await createCommissionAdjustment({
      periodCode: "2026-05",
      userId: "real-sales-a",
      adjustmentType: "SPECIAL_REWARD",
      amountCents: 100000,
      direction: "ADD",
      reason: "Trial run special reward",
      requestedBy: "real-hr"
    });
    await expect(submitSettlementRun(runV1.id, { submittedBy: "real-hr" })).rejects.toMatchObject({
      code: "PENDING_MANUAL_ADJUSTMENTS",
      context: { pendingAdjustmentCount: 1 }
    } satisfies Partial<DbWorkflowError>);
    await submitSettlementRun(runV1.id, { submittedBy: "real-hr", excludePendingAdjustments: true });
    await rejectSettlementRun(runV1.id, {
      rejectedBy: "real-boss",
      reason: "Include approved manual adjustment in a new run."
    });
    await expect(exportApprovedSettlementRun(runV1.id, { exportedBy: "real-hr" })).rejects.toMatchObject({
      code: "SETTLEMENT_RUN_NOT_EXPORTABLE",
      context: { runNo: runV1.runNo }
    } satisfies Partial<DbWorkflowError>);

    const revenueBefore = await sumRevenueForRealPeriod();
    await submitCommissionAdjustment(pendingAdjustment.id, { submittedBy: "real-hr" });
    await approveCommissionAdjustment(pendingAdjustment.id, { approvedBy: "real-boss" });
    const runV2 = await recalculateSettlementRun({ periodCode: "2026-05", calculatedBy: "real-hr", basedOnRunId: runV1.id });
    const revenueAfter = await sumRevenueForRealPeriod();

    expect(runV2.runNo).toBe("2026-05-RUN-002");
    expect(runV2.id).not.toBe(runV1.id);
    expect(revenueAfter).toBe(revenueBefore);
    expect(runV1.snapshot.lines.every((line) => line.adjustmentAmountCents === 0)).toBe(true);
    expect(runV2.snapshot.lines.find((line) => line.userId === "real-sales-a")?.adjustmentAmountCents).toBe(100000);

    await submitSettlementRun(runV2.id, { submittedBy: "real-hr" });
    await approveSettlementRun(runV2.id, { approvedBy: "real-boss" });
    const exportRecord = await exportApprovedSettlementRun(runV2.id, { exportedBy: "real-hr" });
    const reopenRequest = await createPeriodReopenRequest({
      periodCode: "2026-05",
      requestedBy: "real-hr",
      reason: "Need a controlled reopen after first export."
    });
    await approvePeriodReopenRequest(reopenRequest.id, { approvedBy: "real-boss" });
    const report = await generateTrialRunReport(trialRun.id, {
      gitCommit: "h05-test",
      acceptedBy: "real-boss",
      result: "PASS_WITH_LIMITATIONS"
    });

    expect(exportRecord).toMatchObject({ settlementRunId: runV2.id, runNo: runV2.runNo });
    expect(await listExportBindings()).toEqual(expect.arrayContaining([expect.objectContaining({ settlementRunId: runV2.id })]));
    expect(await listSettlementRuns()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: runV1.id, status: "REJECTED" }),
        expect.objectContaining({ id: runV2.id, status: "EXPORTED" })
      ])
    );
    expect(report).toMatchObject({
      periodCode: "2026-05",
      approvalRunNo: runV2.runNo,
      result: "PASS_WITH_LIMITATIONS"
    });
    expect(report.importBatchIds.length).toBeGreaterThanOrEqual(8);
    expect(report.markdown).toContain(`Approved runNo: ${runV2.runNo}`);
  });
});

async function sumRevenueForRealPeriod(): Promise<number> {
  const prisma = await getSqliteClient();
  const rows = await prisma.$queryRawUnsafe<Array<{ total: number | bigint | null }>>(
    `SELECT COALESCE(SUM(receiptAmountCents), 0) AS total
       FROM RevenueReceiptLedger
      WHERE periodId = 'real-period-2026-05'`
  );
  const value = rows[0]?.total;
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}
