import { getSqliteClient, type SqliteRawClient } from "@lcs/database";
import {
  calculateCommissionSettlement,
  type CommissionSettlementInput,
  type RevenueKind,
  type SettlementSnapshotResult,
  type SettlementStatus
} from "@lcs/commission-engine";
import type {
  CommissionAdjustmentRecord,
  CommissionExportBinding,
  PeriodReopenRequestRecord,
  SettlementRunDiff,
  SettlementRunRecord,
  TrialRunIssueRecord,
  TrialRunRecord,
  TrialRunReportRecord
} from "./trial-run-workflow";
import { DbWorkflowError } from "./db-workflow-errors";
import { sumCents, toBool, toNumber } from "./db-workflow-money";
import { summarizeTrialRunCheckIssues, type TrialRunIssueSuggestion } from "./db-workflow-status";

type RawDbClient = SqliteRawClient;
type DbClient = SqliteRawClient;

type TrialRunResult = "PASS" | "PASS_WITH_LIMITATIONS" | "FAIL";
type IssueSeverity = "BLOCKER" | "MAJOR" | "MINOR" | "INFO";
type IssueCategory =
  | "IMPORT"
  | "ORDER"
  | "REVENUE"
  | "DEPOSIT"
  | "EXTERNAL_PROFIT"
  | "RECEIVABLE"
  | "TARGET"
  | "SETTLEMENT"
  | "EXPORT"
  | "PERMISSION";
type IssueStatus = "OPEN" | "FIXING" | "RESOLVED" | "ACCEPTED_RISK";
type AdjustmentDirection = "ADD" | "DEDUCT";
type AdjustmentType =
  | "DATA_CORRECTION"
  | "BOSS_DECISION"
  | "RECEIVABLE_FREEZE"
  | "DEPOSIT_RISK"
  | "SPECIAL_REWARD"
  | "SPECIAL_DEDUCTION"
  | "ROUNDING_CORRECTION"
  | "OTHER";

interface PeriodRow {
  id: string;
  periodCode: string;
  departmentId: string;
  startDate: string | Date;
  endDate: string | Date;
  status: string;
}

interface DepartmentRow {
  id: string;
  name: string;
}

interface SettlementRunRow {
  id: string;
  periodId: string;
  departmentId: string;
  periodCode: string;
  departmentName: string | null;
  runNo: string;
  status: SettlementStatus;
  targetAmountCents: number;
  confirmedRevenueAmountCents: number;
  ownedVehicleRevenueAmountCents: number;
  externalProfitAmountCents: number;
  historicalReceivableRecoveredAmountCents: number;
  achievementRateBps: number;
  appliedCommissionRateBps: number;
  departmentCommissionPoolCents: number;
  calculatedBy: string;
  calculatedAt: string | Date;
  submittedBy: string | null;
  submittedAt: string | Date | null;
  approvedBy: string | null;
  approvedAt: string | Date | null;
  rejectedBy: string | null;
  rejectedAt: string | Date | null;
  rejectionReason: string | null;
}

interface SettlementLineRow {
  id: string;
  settlementRunId: string;
  userId: string;
  employeeName: string | null;
  roleInSettlement: string;
  confirmedContributionAmountCents: number;
  contributionRateBps: number;
  grossCommissionCents: number;
  currentPayoutCents: number;
  quarterlyDeferredCents: number;
  yearEndDeferredCents: number;
  otherDeferredCents: number;
  futurePayoutCents: number;
  frozenAmountCents: number;
  adjustmentAmountCents: number;
  finalCurrentPayableCents: number;
  remark: string | null;
}

interface TrialRunRow {
  id: string;
  periodId: string;
  periodCode: string;
  departmentId: string;
  name: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  startedBy: string;
  startedAt: string | Date;
  completedBy: string | null;
  completedAt: string | Date | null;
  result: TrialRunResult | null;
  summary: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface TrialRunIssueRow {
  id: string;
  trialRunId: string;
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  description: string;
  ownerRole: string;
  status: IssueStatus;
  createdBy: string;
  createdAt: string | Date;
  resolvedBy: string | null;
  resolvedAt: string | Date | null;
  resolution: string | null;
}

interface AdjustmentRow {
  id: string;
  periodId: string;
  periodCode: string;
  settlementRunId: string | null;
  userId: string;
  departmentId: string;
  adjustmentType: AdjustmentType;
  amountCents: number;
  direction: AdjustmentDirection;
  reason: string;
  evidenceUrl: string | null;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "APPLIED";
  requestedBy: string;
  requestedAt: string | Date;
  approvedBy: string | null;
  approvedAt: string | Date | null;
  appliedRunId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface ReopenRequestRow {
  id: string;
  periodId: string;
  periodCode: string;
  requestedBy: string;
  requestedAt: string | Date;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedBy: string | null;
  approvedAt: string | Date | null;
}

interface ReportRow {
  id: string;
  trialRunId: string;
  trialRunName: string | null;
  periodCode: string;
  departmentName: string | null;
  gitCommit: string;
  dataSourceSummary: string;
  importBatchSummary: string | null;
  trialRunRunNos: string;
  approvalRunNo: string;
  targetAmountCents: number;
  confirmedRevenueAmountCents: number;
  achievementRateBps: number;
  commissionPoolCents: number;
  currentPayoutTotalCents: number;
  futurePayoutTotalCents: number;
  adjustmentTotalCents: number;
  frozenTotalCents: number;
  issueSummary: string;
  residualRiskSummary: string | null;
  result: TrialRunResult;
  acceptedBy: string;
  acceptedAt: string | Date;
  markdown: string;
}

export interface TrialRunDetail {
  trialRun: TrialRunRecord;
  periodStatus: string;
  departmentName: string;
  issues: TrialRunIssueRecord[];
  adjustments: CommissionAdjustmentRecord[];
  settlementRuns: SettlementRunRecord[];
  reports: TrialRunReportRecord[];
  exports: CommissionExportBinding[];
}

export interface RealPeriodFixtureResult {
  periodId: string;
  periodCode: string;
  departmentId: string;
  importBatchIds: string[];
}

export interface DbTrialRunCheckReport {
  periodCode: string;
  departmentName: string;
  periodStatus: string;
  importBatchCount: number;
  importBatchSources: string[];
  employeeCount: number;
  vehicleCount: number;
  orderCount: number;
  revenueReceiptCount: number;
  externalProfitReceiptCount: number;
  depositCount: number;
  vehicleStatusEventCount: number;
  departmentTargetCents: number;
  orderReceivableCents: number;
  approvedRentRevenueCents: number;
  approvedExternalProfitCents: number;
  historicalRecoveredCents: number;
  targetTotalCents: number;
  unapprovedRevenueCents: number;
  externalProfitTotalCents: number;
  depositTotalCents: number;
  abnormalDepositCount: number;
  unpaidOrderCount: number;
  pendingRevenueCount: number;
  pendingTargetAdjustmentCount: number;
  approvedTargetAdjustmentCount: number;
  commissionableRevenueCents: number;
  achievementRateBps: number;
  estimatedCommissionPoolCents: number;
  canStartHrCalculation: boolean;
  blockingReasons: string[];
  issueSuggestions: TrialRunIssueSuggestion[];
}

const runNoPattern = /-RUN-(\d+)$/;

function db(): Promise<DbClient> {
  return getSqliteClient();
}

export async function createTrialRun(input: {
  periodId?: string;
  periodCode?: string;
  name: string;
  startedBy: string;
  startedAt?: string;
}): Promise<TrialRunRecord> {
  const client = await db();
  const period = await findPeriod(client, input);
  const now = input.startedAt ?? nowIso();
  const id = createId("trial-run");

  await client.$executeRawUnsafe(
    `INSERT INTO TrialRun (id, periodId, departmentId, name, status, startedBy, startedAt, completedBy, completedAt, result, summary, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'IN_PROGRESS', ?, ?, NULL, NULL, NULL, '', ?, ?)`,
    id,
    period.id,
    period.departmentId,
    input.name,
    input.startedBy,
    now,
    now,
    now
  );

  return getRequiredTrialRun(client, id);
}

export async function listTrialRuns(): Promise<TrialRunRecord[]> {
  const rows = await (await db()).$queryRawUnsafe<TrialRunRow[]>(
    `SELECT tr.*, p.periodCode
       FROM TrialRun tr
       JOIN CommissionPeriod p ON p.id = tr.periodId
      ORDER BY tr.startedAt DESC`
  );
  return rows.map(mapTrialRunRow);
}

export async function getTrialRun(id: string): Promise<TrialRunDetail | null> {
  const client = await db();
  const rows = await client.$queryRawUnsafe<Array<TrialRunRow & { periodStatus: string; departmentName: string | null }>>(
    `SELECT tr.*, p.periodCode, p.status AS periodStatus, d.name AS departmentName
       FROM TrialRun tr
       JOIN CommissionPeriod p ON p.id = tr.periodId
       LEFT JOIN Department d ON d.id = tr.departmentId
      WHERE tr.id = ?`,
    id
  );
  const row = rows[0];
  if (!row) {
    return null;
  }
  const runs = await listSettlementRunsForPeriod(row.periodId);
  const reports = await listTrialRunReports(id);
  const exports = await listExportBindings(row.periodId);
  return {
    trialRun: mapTrialRunRow(row),
    periodStatus: row.periodStatus,
    departmentName: row.departmentName ?? row.departmentId,
    issues: await listTrialRunIssues(id),
    adjustments: await listAdjustmentsForPeriod(row.periodId),
    settlementRuns: runs,
    reports,
    exports
  };
}

export async function createTrialRunIssue(input: {
  trialRunId: string;
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  description: string;
  ownerRole: string;
  createdBy: string;
}): Promise<TrialRunIssueRecord> {
  const client = await db();
  await getRequiredTrialRun(client, input.trialRunId);
  const id = createId("trial-run-issue");

  await client.$executeRawUnsafe(
    `INSERT INTO TrialRunIssue (id, trialRunId, severity, category, title, description, ownerRole, status, createdBy, createdAt, resolvedBy, resolvedAt, resolution)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, NULL, NULL, NULL)`,
    id,
    input.trialRunId,
    input.severity,
    input.category,
    input.title,
    input.description,
    input.ownerRole,
    input.createdBy,
    nowIso()
  );
  return getRequiredIssue(client, id);
}

export async function updateTrialRunIssueStatus(
  issueId: string,
  input: { status: IssueStatus; operatorId?: string; resolution?: string }
): Promise<TrialRunIssueRecord> {
  const client = await db();
  await getRequiredIssue(client, issueId);
  const resolved = input.status === "RESOLVED" || input.status === "ACCEPTED_RISK";

  await client.$executeRawUnsafe(
    `UPDATE TrialRunIssue
        SET status = ?,
            resolvedBy = CASE WHEN ? THEN ? ELSE resolvedBy END,
            resolvedAt = CASE WHEN ? THEN ? ELSE resolvedAt END,
            resolution = CASE WHEN ? THEN ? ELSE resolution END
      WHERE id = ?`,
    input.status,
    resolved ? 1 : 0,
    input.operatorId ?? null,
    resolved ? 1 : 0,
    resolved ? nowIso() : null,
    resolved ? 1 : 0,
    input.resolution ?? null,
    issueId
  );
  return getRequiredIssue(client, issueId);
}

export async function resolveTrialRunIssue(
  issueId: string,
  input: { resolvedBy: string; resolution: string; resolvedAt?: string }
): Promise<TrialRunIssueRecord> {
  const client = await db();
  await getRequiredIssue(client, issueId);
  await client.$executeRawUnsafe(
    `UPDATE TrialRunIssue
        SET status = 'RESOLVED', resolvedBy = ?, resolvedAt = ?, resolution = ?
      WHERE id = ?`,
    input.resolvedBy,
    input.resolvedAt ?? nowIso(),
    input.resolution,
    issueId
  );
  return getRequiredIssue(client, issueId);
}

export async function createCommissionAdjustment(input: {
  periodId?: string;
  periodCode?: string;
  userId: string;
  adjustmentType: AdjustmentType;
  amountCents: number;
  direction: AdjustmentDirection;
  reason: string;
  requestedBy: string;
  evidenceUrl?: string;
  settlementRunId?: string;
}): Promise<CommissionAdjustmentRecord> {
  if (!input.reason.trim()) {
    throw new DbWorkflowError("ADJUSTMENT_REASON_REQUIRED");
  }
  if (input.amountCents <= 0) {
    throw new DbWorkflowError("ADJUSTMENT_AMOUNT_INVALID");
  }
  const client = await db();
  const period = await findPeriod(client, input);
  const now = nowIso();
  const id = createId("commission-adjustment");

  await client.$executeRawUnsafe(
    `INSERT INTO CommissionAdjustment (id, periodId, settlementRunId, userId, departmentId, adjustmentType, amountCents, direction, reason, evidenceUrl, status, requestedBy, requestedAt, approvedBy, approvedAt, appliedRunId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, NULL, NULL, NULL, ?, ?)`,
    id,
    period.id,
    input.settlementRunId ?? null,
    input.userId,
    period.departmentId,
    input.adjustmentType,
    input.amountCents,
    input.direction,
    input.reason,
    input.evidenceUrl ?? null,
    input.requestedBy,
    now,
    now,
    now
  );
  return getRequiredAdjustment(client, id);
}

export async function submitCommissionAdjustment(
  adjustmentId: string,
  input: { submittedBy: string }
): Promise<CommissionAdjustmentRecord> {
  const client = await db();
  const adjustment = await getRequiredAdjustment(client, adjustmentId);
  if (adjustment.status !== "DRAFT") {
    throw new DbWorkflowError("ADJUSTMENT_NOT_DRAFT", { adjustmentId });
  }
  await client.$executeRawUnsafe(`UPDATE CommissionAdjustment SET status = 'SUBMITTED', updatedAt = ? WHERE id = ?`, nowIso(), adjustmentId);
  return getRequiredAdjustment(client, adjustmentId);
}

export async function approveCommissionAdjustment(
  adjustmentId: string,
  input: { approvedBy: string; approvedAt?: string }
): Promise<CommissionAdjustmentRecord> {
  const client = await db();
  const adjustment = await getRequiredAdjustment(client, adjustmentId);
  if (adjustment.status !== "SUBMITTED") {
    throw new DbWorkflowError("ADJUSTMENT_NOT_SUBMITTED", { adjustmentId });
  }
  const approvedAt = input.approvedAt ?? nowIso();
  await client.$executeRawUnsafe(
    `UPDATE CommissionAdjustment
        SET status = 'APPROVED', approvedBy = ?, approvedAt = ?, updatedAt = ?
      WHERE id = ?`,
    input.approvedBy,
    approvedAt,
    approvedAt,
    adjustmentId
  );
  return getRequiredAdjustment(client, adjustmentId);
}

export async function rejectCommissionAdjustment(
  adjustmentId: string,
  input: { rejectedBy: string }
): Promise<CommissionAdjustmentRecord> {
  const client = await db();
  const adjustment = await getRequiredAdjustment(client, adjustmentId);
  if (!["DRAFT", "SUBMITTED"].includes(adjustment.status)) {
    throw new DbWorkflowError("ADJUSTMENT_NOT_REJECTABLE", { adjustmentId });
  }
  await client.$executeRawUnsafe(`UPDATE CommissionAdjustment SET status = 'REJECTED', updatedAt = ? WHERE id = ?`, nowIso(), adjustmentId);
  return getRequiredAdjustment(client, adjustmentId);
}

export async function applyApprovedAdjustmentsToRun(
  periodId: string,
  runId: string,
  tx?: RawDbClient
): Promise<void> {
  const client = tx ?? (await db());
  await client.$executeRawUnsafe(
    `UPDATE CommissionAdjustment
        SET status = 'APPLIED', appliedRunId = ?, updatedAt = ?
      WHERE periodId = ? AND status = 'APPROVED'`,
    runId,
    nowIso(),
    periodId
  );
}

export async function recalculateSettlementRun(input: {
  periodId?: string;
  periodCode?: string;
  calculatedBy: string;
  calculatedAt?: string;
  basedOnRunId?: string;
}): Promise<SettlementRunRecord> {
  return (await db()).$transaction(async (tx) => {
    const period = await findPeriod(tx, input);
    const settlementInput = await buildCommissionInputFromDb(tx, period.id);
    const snapshot = calculateCommissionSettlement(settlementInput);
    const runNo = await buildNextRunNo(tx, period.id, period.periodCode);
    const runId = createId("settlement-run");
    const now = nowIso();

    await tx.$executeRawUnsafe(
      `INSERT INTO CommissionSettlementRun (id, periodId, departmentId, runNo, status, targetAmountCents, confirmedRevenueAmountCents, ownedVehicleRevenueAmountCents, externalProfitAmountCents, historicalReceivableRecoveredAmountCents, achievementRateBps, appliedCommissionRateBps, departmentCommissionPoolCents, calculatedBy, calculatedAt, submittedBy, submittedAt, approvedBy, approvedAt, rejectedBy, rejectedAt, rejectionReason, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'CALCULATED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`,
      runId,
      period.id,
      period.departmentId,
      runNo,
      snapshot.targetAmountCents,
      snapshot.confirmedRevenueAmountCents,
      snapshot.ownedVehicleRevenueAmountCents,
      snapshot.externalProfitAmountCents,
      snapshot.historicalReceivableRecoveredAmountCents,
      snapshot.achievementRateBps,
      snapshot.appliedCommissionRateBps,
      snapshot.departmentCommissionPoolCents,
      input.calculatedBy,
      input.calculatedAt ?? now,
      now,
      now
    );

    for (const line of snapshot.lines) {
      await tx.$executeRawUnsafe(
        `INSERT INTO CommissionSettlementLine (id, settlementRunId, userId, roleInSettlement, confirmedContributionAmountCents, contributionRateBps, grossCommissionCents, currentPayoutCents, quarterlyDeferredCents, yearEndDeferredCents, otherDeferredCents, futurePayoutCents, frozenAmountCents, adjustmentAmountCents, finalCurrentPayableCents, remark, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        createId("settlement-line"),
        runId,
        line.userId,
        line.roleInSettlement,
        line.confirmedContributionAmountCents,
        line.contributionRateBps,
        line.grossCommissionCents,
        line.currentPayoutCents,
        line.quarterlyDeferredCents,
        line.yearEndDeferredCents,
        line.otherDeferredCents,
        line.futurePayoutCents,
        line.frozenAmountCents,
        line.adjustmentAmountCents,
        line.finalCurrentPayableCents,
        line.remark,
        now,
        now
      );
    }

    await applyApprovedAdjustmentsToRun(period.id, runId, tx);
    await tx.$executeRawUnsafe(
      `UPDATE CommissionPeriod SET hrCalculatedAt = ?, status = CASE WHEN status = 'OPEN' THEN 'HR_CALCULATED' ELSE status END WHERE id = ?`,
      input.calculatedAt ?? now,
      period.id
    );

    return getRequiredSettlementRun(tx, runId);
  });
}

export async function submitSettlementRun(
  runId: string,
  input: { submittedBy: string; submittedAt?: string; excludePendingAdjustments?: boolean }
): Promise<SettlementRunRecord> {
  const client = await db();
  const run = await getRequiredSettlementRun(client, runId);
  if (!["CALCULATED", "REJECTED"].includes(run.status)) {
    throw new DbWorkflowError("SETTLEMENT_RUN_NOT_SUBMITTABLE", { runId, runNo: run.runNo, status: run.status });
  }
  const blockers = await countOpenBlockerIssues(client, run.periodCode);
  if (blockers > 0) {
    throw new DbWorkflowError("OPEN_BLOCKER_ISSUES", { blockerCount: blockers, runId, runNo: run.runNo });
  }
  const pendingAdjustments = await countPendingAdjustments(client, runId);
  if (pendingAdjustments > 0 && !input.excludePendingAdjustments) {
    throw new DbWorkflowError("PENDING_MANUAL_ADJUSTMENTS", {
      pendingAdjustmentCount: pendingAdjustments,
      runId,
      runNo: run.runNo
    });
  }
  const submittedAt = input.submittedAt ?? nowIso();
  await client.$executeRawUnsafe(
    `UPDATE CommissionSettlementRun
        SET status = 'SUBMITTED', submittedBy = ?, submittedAt = ?, updatedAt = ?
      WHERE id = ?`,
    input.submittedBy,
    submittedAt,
    submittedAt,
    runId
  );
  await client.$executeRawUnsafe(
    `UPDATE CommissionPeriod SET status = 'PENDING_BOSS_APPROVAL' WHERE id = ?`,
    await getPeriodIdForRun(client, runId)
  );
  await writeApprovalLog(client, "SETTLEMENT_RUN", runId, "SUBMIT", input.submittedBy, "HR", "Submitted settlement run.");
  return getRequiredSettlementRun(client, runId);
}

export async function rejectSettlementRun(
  runId: string,
  input: { rejectedBy: string; reason: string; rejectedAt?: string }
): Promise<SettlementRunRecord> {
  if (!input.reason.trim()) {
    throw new DbWorkflowError("REJECTION_REASON_REQUIRED", { runId });
  }
  const client = await db();
  const run = await getRequiredSettlementRun(client, runId);
  if (run.status !== "SUBMITTED") {
    throw new DbWorkflowError("SETTLEMENT_RUN_NOT_REJECTABLE", { runId, runNo: run.runNo, status: run.status });
  }
  const rejectedAt = input.rejectedAt ?? nowIso();
  await client.$executeRawUnsafe(
    `UPDATE CommissionSettlementRun
        SET status = 'REJECTED', rejectedBy = ?, rejectedAt = ?, rejectionReason = ?, updatedAt = ?
      WHERE id = ?`,
    input.rejectedBy,
    rejectedAt,
    input.reason,
    rejectedAt,
    runId
  );
  await client.$executeRawUnsafe(
    `UPDATE CommissionPeriod SET status = 'REJECTED' WHERE id = ?`,
    await getPeriodIdForRun(client, runId)
  );
  await writeApprovalLog(client, "SETTLEMENT_RUN", runId, "REJECT", input.rejectedBy, "BOSS", input.reason);
  return getRequiredSettlementRun(client, runId);
}

export async function approveSettlementRun(
  runId: string,
  input: { approvedBy: string; approvedAt?: string }
): Promise<SettlementRunRecord> {
  const client = await db();
  const run = await getRequiredSettlementRun(client, runId);
  if (run.status !== "SUBMITTED") {
    throw new DbWorkflowError("SETTLEMENT_RUN_NOT_APPROVABLE", { runId, runNo: run.runNo, status: run.status });
  }
  const approvedAt = input.approvedAt ?? nowIso();
  const periodId = await getPeriodIdForRun(client, runId);
  await client.$executeRawUnsafe(
    `UPDATE CommissionSettlementRun
        SET status = 'APPROVED', approvedBy = ?, approvedAt = ?, updatedAt = ?
      WHERE id = ?`,
    input.approvedBy,
    approvedAt,
    approvedAt,
    runId
  );
  await client.$executeRawUnsafe(
    `UPDATE CommissionPeriod SET status = 'BOSS_APPROVED', bossApprovedAt = ? WHERE id = ?`,
    approvedAt,
    periodId
  );
  await writeApprovalLog(client, "SETTLEMENT_RUN", runId, "APPROVE", input.approvedBy, "BOSS", "Approved settlement run.");
  return getRequiredSettlementRun(client, runId);
}

export async function exportApprovedSettlementRun(
  runId: string,
  input: { exportedBy: string; exportType?: "XLSX" | "CSV"; exportedAt?: string; fileUrl?: string }
): Promise<CommissionExportBinding> {
  const client = await db();
  const run = await getRequiredSettlementRun(client, runId);
  if (!["APPROVED", "EXPORTED"].includes(run.status)) {
    throw new DbWorkflowError("SETTLEMENT_RUN_NOT_EXPORTABLE", { runId, runNo: run.runNo, status: run.status });
  }
  const exportedAt = input.exportedAt ?? nowIso();
  const exportType = input.exportType ?? "XLSX";
  const recordId = createId("commission-export");
  const fileName = `${run.runNo}-payout.${exportType.toLowerCase()}`;
  await client.$executeRawUnsafe(
    `INSERT INTO CommissionExportRecord (id, settlementRunId, exportType, fileName, fileUrl, exportedBy, exportedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    recordId,
    runId,
    exportType,
    fileName,
    input.fileUrl ?? `/exports/${fileName}`,
    input.exportedBy,
    exportedAt
  );
  await client.$executeRawUnsafe(
    `UPDATE CommissionSettlementRun SET status = 'EXPORTED', updatedAt = ? WHERE id = ?`,
    exportedAt,
    runId
  );
  await writeApprovalLog(client, "SETTLEMENT_RUN", runId, "EXPORT", input.exportedBy, "HR", `Exported ${fileName}.`);
  return getRequiredExportBinding(client, recordId);
}

export async function createPeriodReopenRequest(input: {
  periodId?: string;
  periodCode?: string;
  requestedBy: string;
  reason: string;
}): Promise<PeriodReopenRequestRecord> {
  if (!input.reason.trim()) {
    throw new DbWorkflowError("PERIOD_REOPEN_REASON_REQUIRED");
  }
  const client = await db();
  const period = await findPeriod(client, input);
  const id = createId("period-reopen");
  const now = nowIso();
  await client.$executeRawUnsafe(
    `INSERT INTO PeriodReopenRequest (id, periodId, requestedBy, requestedAt, reason, status, approvedBy, approvedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 'PENDING', NULL, NULL, ?, ?)`,
    id,
    period.id,
    input.requestedBy,
    now,
    input.reason,
    now,
    now
  );
  return getRequiredReopenRequest(client, id);
}

export async function approvePeriodReopenRequest(
  requestId: string,
  input: { approvedBy: string; approvedAt?: string }
): Promise<PeriodReopenRequestRecord> {
  const client = await db();
  const request = await getRequiredReopenRequest(client, requestId);
  if (request.status !== "PENDING") {
    throw new DbWorkflowError("PERIOD_REOPEN_NOT_PENDING", { requestId, status: request.status });
  }
  const approvedAt = input.approvedAt ?? nowIso();
  await client.$executeRawUnsafe(
    `UPDATE PeriodReopenRequest
        SET status = 'APPROVED', approvedBy = ?, approvedAt = ?, updatedAt = ?
      WHERE id = ?`,
    input.approvedBy,
    approvedAt,
    approvedAt,
    requestId
  );
  await client.$executeRawUnsafe(`UPDATE CommissionPeriod SET status = 'OPEN' WHERE periodCode = ?`, request.periodCode);
  await writeApprovalLog(client, "PERIOD", request.periodCode, "UNLOCK", input.approvedBy, "BOSS", request.reason);
  return getRequiredReopenRequest(client, requestId);
}

export async function generateTrialRunReport(
  trialRunId: string,
  input: { gitCommit: string; acceptedBy: string; acceptedAt?: string; result?: TrialRunResult; residualRiskSummary?: string }
): Promise<TrialRunReportRecord> {
  const client = await db();
  const detail = await getTrialRun(trialRunId);
  if (!detail) {
    throw new DbWorkflowError("TRIAL_RUN_NOT_FOUND", { trialRunId });
  }
  const result = input.result ?? detail.trialRun.result ?? deriveTrialRunResult(detail.issues);
  const approvedRun = [...detail.settlementRuns].reverse().find((run) => ["APPROVED", "EXPORTED"].includes(run.status));
  if (!approvedRun) {
    throw new DbWorkflowError("TRIAL_RUN_REPORT_APPROVED_RUN_REQUIRED", { trialRunId });
  }
  const importBatches = await listCommittedImportBatches(client);
  const acceptedAt = input.acceptedAt ?? nowIso();
  const issueSummary = summarizeIssues(detail.issues);
  const report = buildReportRecord(
    detail,
    approvedRun,
    importBatches.map((batch) => batch.id),
    input.gitCommit,
    input.acceptedBy,
    acceptedAt,
    result,
    issueSummary,
    input.residualRiskSummary ?? ""
  );
  const id = createId("trial-run-report");

  await client.$executeRawUnsafe(
    `INSERT INTO TrialRunReport (id, trialRunId, periodId, departmentId, gitCommit, dataSourceSummary, importBatchSummary, trialRunRunNos, approvalRunNo, targetAmountCents, confirmedRevenueAmountCents, achievementRateBps, commissionPoolCents, currentPayoutTotalCents, futurePayoutTotalCents, adjustmentTotalCents, frozenTotalCents, issueSummary, residualRiskSummary, result, acceptedBy, acceptedAt, markdown, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    detail.trialRun.id,
    await getPeriodIdByCode(client, detail.trialRun.periodCode),
    detail.trialRun.departmentId,
    input.gitCommit,
    report.dataSources.join(", "),
    report.importBatchIds.join(", "),
    report.trialRunRunNos.join(", "),
    report.approvalRunNo,
    report.targetAmountCents,
    report.confirmedRevenueAmountCents,
    report.achievementRateBps,
    report.commissionPoolCents,
    report.currentPayoutTotalCents,
    report.futurePayoutTotalCents,
    report.adjustmentTotalCents,
    report.frozenTotalCents,
    issueSummary,
    input.residualRiskSummary ?? null,
    result,
    input.acceptedBy,
    acceptedAt,
    report.markdown,
    nowIso()
  );
  await client.$executeRawUnsafe(
    `UPDATE TrialRun
        SET status = 'COMPLETED', completedBy = ?, completedAt = ?, result = ?, summary = ?, updatedAt = ?
      WHERE id = ?`,
    input.acceptedBy,
    acceptedAt,
    result,
    detail.trialRun.summary || "Real-period trial run report generated.",
    acceptedAt,
    trialRunId
  );
  return getRequiredReport(client, id);
}

export async function getSettlementRunDiff(fromRunId: string, toRunId: string): Promise<SettlementRunDiff> {
  const client = await db();
  const previous = await getRequiredSettlementRun(client, fromRunId);
  const next = await getRequiredSettlementRun(client, toRunId);
  return buildDiff(previous, next);
}

export async function getSettlementRun(runId: string): Promise<SettlementRunRecord> {
  return getRequiredSettlementRun(await db(), runId);
}

export async function getSettlementRunDiffForLatest(runId: string): Promise<SettlementRunDiff | null> {
  const client = await db();
  const run = await getRequiredSettlementRun(client, runId);
  const periodId = await getPeriodIdForRun(client, runId);
  const previousRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM CommissionSettlementRun
      WHERE periodId = ? AND departmentId = ? AND id <> ?
      ORDER BY calculatedAt DESC`,
    periodId,
    run.departmentId,
    runId
  );
  const previous = previousRows[0];
  return previous ? getSettlementRunDiff(previous.id, runId) : null;
}

export async function listSettlementRuns(): Promise<SettlementRunRecord[]> {
  const rows = await (await db()).$queryRawUnsafe<SettlementRunRow[]>(
    `SELECT csr.*, p.periodCode, d.name AS departmentName
       FROM CommissionSettlementRun csr
       JOIN CommissionPeriod p ON p.id = csr.periodId
       LEFT JOIN Department d ON d.id = csr.departmentId
      ORDER BY csr.calculatedAt DESC`
  );
  return Promise.all(rows.map((row) => mapSettlementRun(row)));
}

export async function listAdjustments(): Promise<CommissionAdjustmentRecord[]> {
  const rows = await (await db()).$queryRawUnsafe<AdjustmentRow[]>(
    `SELECT ca.*, p.periodCode
       FROM CommissionAdjustment ca
       JOIN CommissionPeriod p ON p.id = ca.periodId
      ORDER BY ca.createdAt DESC`
  );
  return rows.map(mapAdjustmentRow);
}

async function listAdjustmentsForPeriod(periodId: string): Promise<CommissionAdjustmentRecord[]> {
  const rows = await (await db()).$queryRawUnsafe<AdjustmentRow[]>(
    `SELECT ca.*, p.periodCode
       FROM CommissionAdjustment ca
       JOIN CommissionPeriod p ON p.id = ca.periodId
      WHERE ca.periodId = ?
      ORDER BY ca.createdAt DESC`,
    periodId
  );
  return rows.map(mapAdjustmentRow);
}

export async function listExportBindings(periodId?: string): Promise<CommissionExportBinding[]> {
  const where = periodId ? "WHERE csr.periodId = ?" : "";
  const values = periodId ? [periodId] : [];
  const rows = await (await db()).$queryRawUnsafe<
    Array<{
      id: string;
      settlementRunId: string;
      runNo: string;
      periodCode: string;
      exportType: "XLSX";
      fileName: string;
      exportedBy: string;
      exportedAt: string | Date;
    }>
  >(
    `SELECT cer.id, cer.settlementRunId, csr.runNo, p.periodCode, cer.exportType, cer.fileName, cer.exportedBy, cer.exportedAt
       FROM CommissionExportRecord cer
       JOIN CommissionSettlementRun csr ON csr.id = cer.settlementRunId
       JOIN CommissionPeriod p ON p.id = csr.periodId
       ${where}
      ORDER BY cer.exportedAt DESC`,
    ...values
  );
  return rows.map(mapExportRow);
}

export async function buildTrialRunCheckReportFromDb(periodCode?: string): Promise<DbTrialRunCheckReport | null> {
  const client = await db();
  const periodRows = await client.$queryRawUnsafe<Array<PeriodRow & { departmentName: string | null }>>(
    `SELECT p.*, d.name AS departmentName
       FROM CommissionPeriod p
       LEFT JOIN Department d ON d.id = p.departmentId
      ${periodCode ? "WHERE p.periodCode = ?" : ""}
      ORDER BY p.startDate DESC
      LIMIT 1`,
    ...(periodCode ? [periodCode] : [])
  );
  const period = periodRows[0];
  if (!period) {
    return null;
  }
  const input = await buildCommissionInputFromDb(client, period.id);
  const snapshot = calculateCommissionSettlement(input);
  const importBatches = await listCommittedImportBatches(client);
  const employeeCount = await countRows(
    client,
    `SELECT COUNT(*) AS countValue FROM Employee WHERE departmentId = ?`,
    period.departmentId
  );
  const vehicleCount = await countRows(
    client,
    `SELECT COUNT(DISTINCT vehicleId) AS countValue FROM LeaseOrderLedger WHERE periodId = ?`,
    period.id
  );
  const orderCount = await countRows(
    client,
    `SELECT COUNT(*) AS countValue FROM LeaseOrderLedger WHERE periodId = ?`,
    period.id
  );
  const revenueReceiptCount = await countRows(
    client,
    `SELECT COUNT(*) AS countValue FROM RevenueReceiptLedger WHERE periodId = ?`,
    period.id
  );
  const externalProfitReceiptCount = await countRows(
    client,
    `SELECT COUNT(*) AS countValue FROM ExternalProfitReceipt WHERE periodId = ?`,
    period.id
  );
  const depositCount = await countRows(
    client,
    `SELECT COUNT(*) AS countValue FROM DepositLedger WHERE periodId = ?`,
    period.id
  );
  const vehicleStatusEventCount = await countRows(
    client,
    `SELECT COUNT(*) AS countValue FROM VehicleStatusEvent WHERE periodId = ?`,
    period.id
  );
  const orderReceivable = await sumColumn(client, "LeaseOrderLedger", "receivableRentAmountCents", period.id);
  const depositTotal = await sumColumn(client, "DepositLedger", "depositAmountCents", period.id);
  const targetTotal = await sumColumn(client, "CommissionTarget", "targetAmountCents", period.id);
  const unapprovedRevenue = await sumQuery(
    client,
    `SELECT COALESCE(SUM(receiptAmountCents), 0) AS total
       FROM RevenueReceiptLedger
      WHERE periodId = ? AND financeReviewStatus <> 'APPROVED'`,
    period.id
  );
  const externalProfitTotal = await sumColumn(client, "ExternalProfitReceipt", "profitAmountCents", period.id);
  const pendingRevenueCount = await countRows(
    client,
    `SELECT COUNT(*) AS countValue FROM RevenueReceiptLedger WHERE periodId = ? AND financeReviewStatus <> 'APPROVED'`,
    period.id
  );
  const unpaidOrderCount = await countRows(
    client,
    `SELECT COUNT(*) AS countValue
       FROM LeaseOrderLedger lo
      WHERE lo.periodId = ?
        AND lo.receivableRentAmountCents > (
          SELECT COALESCE(SUM(rr.receiptAmountCents), 0)
            FROM RevenueReceiptLedger rr
           WHERE rr.orderId = lo.id AND rr.financeReviewStatus = 'APPROVED'
        )`,
    period.id
  );
  const abnormalDepositCount = await countRows(
    client,
    `SELECT COUNT(*) AS countValue FROM DepositLedger WHERE periodId = ? AND refundStatus = 'DISPUTED'`,
    period.id
  );
  const pendingTargetAdjustmentCount = await countRows(
    client,
    `SELECT COUNT(*) AS countValue FROM TargetAdjustmentRequest WHERE periodId = ? AND status = 'PENDING'`,
    period.id
  );
  const approvedTargetAdjustmentCount = await countRows(
    client,
    `SELECT COUNT(*) AS countValue FROM TargetAdjustmentRequest WHERE periodId = ? AND status = 'APPROVED'`,
    period.id
  );
  const issueSuggestions = summarizeTrialRunCheckIssues({
    pendingRevenueCount,
    abnormalDepositCount,
    vehicleStatusEventCount,
    approvedTargetAdjustmentCount,
    pendingTargetAdjustmentCount
  });
  const blockingReasons = [
    pendingRevenueCount > 0 ? "There are unapproved revenue receipts." : "",
    period.status === "BOSS_APPROVED" || period.status === "CLOSED" ? "The period has already been approved or closed." : ""
  ].filter(Boolean);

  return {
    periodCode: period.periodCode,
    departmentName: period.departmentName ?? period.departmentId,
    periodStatus: period.status,
    importBatchCount: importBatches.length,
    importBatchSources: importBatches.map((batch) => batch.importType),
    employeeCount,
    vehicleCount,
    orderCount,
    revenueReceiptCount,
    externalProfitReceiptCount,
    depositCount,
    vehicleStatusEventCount,
    departmentTargetCents: snapshot.targetAmountCents,
    orderReceivableCents: orderReceivable,
    approvedRentRevenueCents: snapshot.ownedVehicleRevenueAmountCents,
    approvedExternalProfitCents: snapshot.externalProfitAmountCents,
    historicalRecoveredCents: snapshot.historicalReceivableRecoveredAmountCents,
    targetTotalCents: targetTotal,
    unapprovedRevenueCents: unapprovedRevenue,
    externalProfitTotalCents: externalProfitTotal,
    depositTotalCents: depositTotal,
    abnormalDepositCount,
    unpaidOrderCount,
    pendingRevenueCount,
    pendingTargetAdjustmentCount,
    approvedTargetAdjustmentCount,
    commissionableRevenueCents: snapshot.confirmedRevenueAmountCents,
    achievementRateBps: snapshot.achievementRateBps,
    estimatedCommissionPoolCents: snapshot.departmentCommissionPoolCents,
    canStartHrCalculation: blockingReasons.length === 0,
    blockingReasons,
    issueSuggestions
  };
}

export async function seedRealPeriodFixtureForTest(): Promise<RealPeriodFixtureResult> {
  const client = await db();
  const periodCode = "2026-05";
  const departmentId = "real-dept-direct";
  const periodId = "real-period-2026-05";
  const ids = {
    boss: "real-boss",
    hr: "real-hr",
    finance: "real-finance",
    asset: "real-asset",
    salesA: "real-sales-a",
    salesB: "real-sales-b",
    salesC: "real-sales-c",
    vehicleA: "real-vehicle-a",
    vehicleB: "real-vehicle-b",
    vehicleC: "real-vehicle-c",
    ruleSet: "real-rule-set-2026-05"
  };
  const now = "2026-06-05T09:00:00.000Z";

  await cleanupRealPeriodFixture(client, periodId, departmentId);
  await client.$executeRawUnsafe(
    `INSERT INTO Department (id, name, createdAt, updatedAt) VALUES (?, '鐩磋惀閮?, ?, ?)`,
    departmentId,
    now,
    now
  );
  for (const employee of [
    [ids.boss, "鑰佹澘", "BOSS"],
    [ids.hr, "HR", "HR"],
    [ids.finance, "璐㈠姟", "FINANCE"],
    [ids.asset, "璧勭", "ASSET_MANAGER"],
    [ids.salesA, "閿€鍞?A", "SALES"],
    [ids.salesB, "閿€鍞?B", "SALES"],
    [ids.salesC, "閿€鍞?C", "SALES"]
  ] as const) {
    await client.$executeRawUnsafe(
      `INSERT INTO Employee (id, name, departmentId, role, loginName, passwordHash, isCommissionable, employmentStatus, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, NULL, ?, 'ACTIVE', ?, ?)`,
      employee[0],
      employee[1],
      departmentId,
      employee[2],
      employee[0],
      employee[2] === "SALES" ? 1 : 0,
      now,
      now
    );
  }
  for (const vehicle of [
    [ids.vehicleA, "绮****1", "LCSREALVINA", "OWNED", 22000000],
    [ids.vehicleB, "绮****2", "LCSREALVINB", "OWNED", 18000000],
    [ids.vehicleC, "绮****3", "LCSREALVINC", "EXTERNAL", 0]
  ] as const) {
    await client.$executeRawUnsafe(
      `INSERT INTO Vehicle (id, plateNo, vin, brand, model, vehicleSourceType, ownerType, status, monthlyTargetAmountCents, remark, createdAt, updatedAt)
       VALUES (?, ?, ?, '璇曡繍琛?, '鑴辨晱杞﹁締', ?, ?, 'ACTIVE', ?, 'H05 real-period fixture', ?, ?)`,
      vehicle[0],
      vehicle[1],
      vehicle[2],
      vehicle[3],
      vehicle[3] === "OWNED" ? "COMPANY" : "THIRD_PARTY",
      vehicle[4],
      now,
      now
    );
  }
  await client.$executeRawUnsafe(
    `INSERT INTO CommissionPeriod (id, periodCode, departmentId, startDate, endDate, status, createdBy, createdAt, financeLockedAt, hrCalculatedAt, bossApprovedAt, closedAt, remark)
     VALUES (?, ?, ?, '2026-05-01T00:00:00.000Z', '2026-05-31T00:00:00.000Z', 'OPEN', ?, ?, NULL, NULL, NULL, NULL, 'H05 real-period fixture')`,
    periodId,
    periodCode,
    departmentId,
    ids.boss,
    now
  );
  await client.$executeRawUnsafe(
    `INSERT INTO CommissionTarget (id, periodId, departmentId, vehicleId, targetAmountCents, sourceType, isIncluded, remark, createdBy, createdAt)
     VALUES ('real-target-2026-05', ?, ?, NULL, 45000000, 'MANUAL', 1, 'Real-period base target', ?, ?)`,
    periodId,
    departmentId,
    ids.boss,
    now
  );
  await client.$executeRawUnsafe(
    `INSERT INTO CommissionRuleSet (id, name, departmentId, effectiveFrom, effectiveTo, status, createdBy, createdAt)
     VALUES (?, 'H05 real-period tier rules', ?, '2026-05-01T00:00:00.000Z', NULL, 'ACTIVE', ?, ?)`,
    ids.ruleSet,
    departmentId,
    ids.boss,
    now
  );
  for (const tier of [
    ["real-tier-70", 7000, 8000, 300, 1],
    ["real-tier-80", 8000, 9000, 500, 2],
    ["real-tier-90", 9000, 10000, 700, 3],
    ["real-tier-100", 10000, null, 1000, 4]
  ] as const) {
    await client.$executeRawUnsafe(
      `INSERT INTO CommissionTierRule (id, ruleSetId, minAchievementRateBps, maxAchievementRateBps, commissionRateBps, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?)`,
      tier[0],
      ids.ruleSet,
      tier[1],
      tier[2],
      tier[3],
      tier[4]
    );
  }
  for (const rule of [
    ["real-payout-current", "CURRENT", 6000, 1],
    ["real-payout-quarterly", "QUARTERLY", 2000, 2],
    ["real-payout-year-end", "YEAR_END", 2000, 3]
  ] as const) {
    await client.$executeRawUnsafe(
      `INSERT INTO CommissionPayoutRule (id, ruleSetId, payoutStage, payoutRatioBps, conditionRemark, sortOrder)
       VALUES (?, ?, ?, ?, 'H05 real-period payout split', ?)`,
      rule[0],
      ids.ruleSet,
      rule[1],
      rule[2],
      rule[3]
    );
  }
  for (const order of [
    ["real-order-a", "REAL-202605-A-OWNED", ids.salesA, ids.vehicleA, "OWNED", 22000000, "COMPLETED"],
    ["real-order-b", "REAL-202605-B-OWNED", ids.salesB, ids.vehicleB, "OWNED", 14000000, "COMPLETED"],
    ["real-order-c", "REAL-202605-C-EXTERNAL", ids.salesC, ids.vehicleC, "EXTERNAL", 0, "COMPLETED"],
    ["real-order-unpaid", "REAL-202605-A-UNPAID", ids.salesA, ids.vehicleA, "OWNED", 3200000, "ACTIVE"]
  ] as const) {
    await client.$executeRawUnsafe(
      `INSERT INTO LeaseOrderLedger (id, orderNo, periodId, departmentId, salesUserId, customerName, vehicleId, vehicleSourceType, billingMode, rentalStartDate, rentalEndDate, receivableRentAmountCents, orderStatus, submittedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'MONTHLY', '2026-05-01T00:00:00.000Z', '2026-05-31T00:00:00.000Z', ?, ?, '2026-05-01T00:00:00.000Z', ?, ?)`,
      order[0],
      order[1],
      periodId,
      departmentId,
      order[2],
      `瀹㈡埛${order[1].slice(-1)}`,
      order[3],
      order[4],
      order[5],
      order[6],
      now,
      now
    );
  }
  for (const receipt of [
    ["real-revenue-a", "real-order-a", ids.salesA, 22000000, "OWNED_RENT", "APPROVED"],
    ["real-revenue-b", "real-order-b", ids.salesB, 14000000, "OWNED_RENT", "APPROVED"],
    ["real-revenue-history-b", "real-order-b", ids.salesB, 1000000, "HISTORICAL_RECEIVABLE", "APPROVED"],
    ["real-revenue-unpaid-a", "real-order-unpaid", ids.salesA, 3200000, "OWNED_RENT", "PENDING"]
  ] as const) {
    await client.$executeRawUnsafe(
      `INSERT INTO RevenueReceiptLedger (id, orderId, periodId, salesUserId, receiptAmountCents, receiptDate, companyAccount, receiptProofUrl, financeReviewStatus, isCommissionable, revenueKind, financeReviewedBy, financeReviewedAt, remark, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, '2026-05-21T00:00:00.000Z', '鍏徃璇曡繍琛岃处鎴?, 'https://mock.local/proof', ?, 1, ?, ?, ?, 'H05 real-period fixture', ?, ?)`,
      receipt[0],
      receipt[1],
      periodId,
      receipt[2],
      receipt[3],
      receipt[5],
      receipt[4],
      receipt[5] === "APPROVED" ? ids.finance : null,
      receipt[5] === "APPROVED" ? "2026-06-02T00:00:00.000Z" : null,
      now,
      now
    );
  }
  await client.$executeRawUnsafe(
    `INSERT INTO ExternalProfitReceipt (id, orderId, periodId, salesUserId, profitAmountCents, remitDate, companyAccount, receiptProofUrl, financeReviewStatus, isCommissionable, financeReviewedBy, financeReviewedAt, remark, createdAt, updatedAt)
     VALUES ('real-external-profit-c', 'real-order-c', ?, ?, 8000000, '2026-05-22T00:00:00.000Z', '鍏徃璇曡繍琛岃处鎴?, 'https://mock.local/external-profit', 'APPROVED', 1, ?, '2026-06-02T00:00:00.000Z', 'Only remitted profit is recorded', ?, ?)`,
    periodId,
    ids.salesC,
    ids.finance,
    now,
    now
  );
  for (const deposit of [
    ["real-deposit-a", "real-order-a", ids.salesA, 5000000, "HELD"],
    ["real-deposit-b", "real-order-b", ids.salesB, 3000000, "DISPUTED"]
  ] as const) {
    await client.$executeRawUnsafe(
      `INSERT INTO DepositLedger (id, orderId, periodId, salesUserId, depositAmountCents, holderUserId, receivedDate, refundAmountCents, refundDate, refundStatus, remark, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, '2026-05-01T00:00:00.000Z', 0, NULL, ?, 'Deposit is excluded from commission', ?, ?)`,
      deposit[0],
      deposit[1],
      periodId,
      deposit[2],
      deposit[3],
      deposit[2],
      deposit[4],
      now,
      now
    );
  }
  await client.$executeRawUnsafe(
    `INSERT INTO VehicleStatusEvent (id, vehicleId, periodId, eventType, startDate, endDate, reason, createdBy, createdAt)
     VALUES ('real-vehicle-event-repair', ?, ?, 'REPAIR', '2026-05-12T00:00:00.000Z', '2026-05-13T00:00:00.000Z', 'Real-period trial status event', ?, ?)`,
    ids.vehicleB,
    periodId,
    ids.asset,
    now
  );
  await client.$executeRawUnsafe(
    `INSERT INTO TargetAdjustmentRequest (id, periodId, vehicleId, requestedBy, reasonType, originalTargetAmountCents, adjustedTargetAmountCents, reason, status, approvedBy, approvedAt, approvalRemark, createdAt, updatedAt)
     VALUES ('real-target-adjustment-pending', ?, ?, ?, 'REPAIR', 45000000, 44000000, 'Pending target adjustment should not affect current run', 'PENDING', NULL, NULL, NULL, ?, ?)`,
    periodId,
    ids.vehicleB,
    ids.asset,
    now,
    now
  );
  const importBatchIds: string[] = [];
  for (const importType of ["employees", "vehicles", "targets", "orders", "revenue", "external-profit", "deposits", "vehicle-events"]) {
    const batchId = `real-import-${importType}-202605`;
    importBatchIds.push(batchId);
    await client.$executeRawUnsafe(
      `INSERT INTO ImportBatch (id, importType, fileName, fileHash, status, dryRun, totalRows, validRows, errorRows, createdBy, createdAt, committedBy, committedAt, remark)
       VALUES (?, ?, ?, ?, 'COMMITTED', 0, 1, 1, 0, ?, ?, ?, ?, ?)`,
      batchId,
      importType,
      `${importType}.real.csv`,
      `hash-${importType}-202605`,
      ids.hr,
      now,
      ids.hr,
      now,
      "H05 sanitized real-period fixture"
    );
    await client.$executeRawUnsafe(
      `INSERT INTO ImportBatchRow (id, batchId, rowNumber, rawJson, normalizedJson, status, errorCode, errorMessage, createdAt)
       VALUES (?, ?, 2, '{}', '{}', 'VALID', NULL, NULL, ?)`,
      `${batchId}-row-1`,
      batchId,
      now
    );
  }

  return { periodId, periodCode, departmentId, importBatchIds };
}

async function buildCommissionInputFromDb(client: RawDbClient, periodId: string): Promise<CommissionSettlementInput> {
  const period = await getRequiredPeriod(client, periodId);
  const targetRows = await client.$queryRawUnsafe<Array<{ total: number | bigint | null }>>(
    `SELECT COALESCE(SUM(targetAmountCents), 0) AS total
       FROM CommissionTarget
      WHERE periodId = ? AND departmentId = ? AND isIncluded = 1 AND sourceType <> 'ADJUSTED'`,
    period.id,
    period.departmentId
  );
  const ruleSet = await findRuleSet(client, period.departmentId);
  const tiers = await client.$queryRawUnsafe<CommissionSettlementInput["tiers"]>(
    `SELECT id, minAchievementRateBps, maxAchievementRateBps, commissionRateBps, sortOrder
       FROM CommissionTierRule
      WHERE ruleSetId = ?
      ORDER BY sortOrder ASC`,
    ruleSet.id
  );
  const payoutRules = await client.$queryRawUnsafe<CommissionSettlementInput["payoutRules"]>(
    `SELECT payoutStage, payoutRatioBps, sortOrder
       FROM CommissionPayoutRule
      WHERE ruleSetId = ?
      ORDER BY sortOrder ASC`,
    ruleSet.id
  );
  const revenueReceipts = await client.$queryRawUnsafe<CommissionSettlementInput["revenueReceipts"]>(
    `SELECT id, salesUserId, receiptAmountCents, financeReviewStatus, isCommissionable, revenueKind
       FROM RevenueReceiptLedger
      WHERE periodId = ?`,
    period.id
  );
  const externalProfitReceipts = await client.$queryRawUnsafe<CommissionSettlementInput["externalProfitReceipts"]>(
    `SELECT id, salesUserId, profitAmountCents, financeReviewStatus, isCommissionable
       FROM ExternalProfitReceipt
      WHERE periodId = ?`,
    period.id
  );
  const deposits = await client.$queryRawUnsafe<CommissionSettlementInput["deposits"]>(
    `SELECT id, salesUserId, depositAmountCents, refundStatus
       FROM DepositLedger
      WHERE periodId = ?`,
    period.id
  );
  const targetAdjustments = await client.$queryRawUnsafe<CommissionSettlementInput["targetAdjustments"]>(
    `SELECT id, status, originalTargetAmountCents, adjustedTargetAmountCents
       FROM TargetAdjustmentRequest
      WHERE periodId = ?`,
    period.id
  );
  const employees = await client.$queryRawUnsafe<CommissionSettlementInput["employees"]>(
    `SELECT id AS userId, name, role AS roleInSettlement
       FROM Employee
      WHERE departmentId = ? AND role IN ('SALES', 'SALES_MANAGER') AND isCommissionable = 1
      ORDER BY id ASC`,
    period.departmentId
  );
  const adjustmentAmountByUserId = await buildApprovedAdjustmentMap(client, period.id);

  return {
    periodCode: period.periodCode,
    departmentId: period.departmentId,
    targetAmountCents: toNumber(targetRows[0]?.total),
    revenueReceipts: revenueReceipts.map((receipt) => ({
      ...receipt,
      receiptAmountCents: toNumber(receipt.receiptAmountCents),
      isCommissionable: toBool(receipt.isCommissionable),
      revenueKind: receipt.revenueKind as RevenueKind
    })),
    externalProfitReceipts: externalProfitReceipts.map((receipt) => ({
      ...receipt,
      profitAmountCents: toNumber(receipt.profitAmountCents),
      isCommissionable: toBool(receipt.isCommissionable)
    })),
    deposits: deposits.map((deposit) => ({
      ...deposit,
      depositAmountCents: toNumber(deposit.depositAmountCents)
    })),
    targetAdjustments: targetAdjustments.map((adjustment) => ({
      ...adjustment,
      originalTargetAmountCents: toNumber(adjustment.originalTargetAmountCents),
      adjustedTargetAmountCents: toNumber(adjustment.adjustedTargetAmountCents)
    })),
    tiers: tiers.map((tier) => ({
      ...tier,
      minAchievementRateBps: toNumber(tier.minAchievementRateBps),
      maxAchievementRateBps: tier.maxAchievementRateBps === null ? null : toNumber(tier.maxAchievementRateBps),
      commissionRateBps: toNumber(tier.commissionRateBps),
      sortOrder: toNumber(tier.sortOrder)
    })),
    payoutRules: payoutRules.map((rule) => ({
      ...rule,
      payoutRatioBps: toNumber(rule.payoutRatioBps),
      sortOrder: toNumber(rule.sortOrder)
    })),
    employees,
    adjustmentAmountByUserId
  };
}

function mapTrialRunRow(row: TrialRunRow): TrialRunRecord {
  return {
    id: row.id,
    periodCode: row.periodCode,
    departmentId: row.departmentId,
    name: row.name,
    status: row.status,
    startedBy: row.startedBy,
    startedAt: iso(row.startedAt),
    completedBy: row.completedBy ?? undefined,
    completedAt: row.completedAt ? iso(row.completedAt) : undefined,
    result: row.result ?? undefined,
    summary: row.summary ?? "",
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt)
  };
}

function mapIssueRow(row: TrialRunIssueRow): TrialRunIssueRecord {
  return {
    id: row.id,
    trialRunId: row.trialRunId,
    severity: row.severity,
    category: row.category,
    title: row.title,
    description: row.description,
    ownerRole: row.ownerRole,
    status: row.status,
    createdBy: row.createdBy,
    createdAt: iso(row.createdAt),
    resolvedBy: row.resolvedBy ?? undefined,
    resolvedAt: row.resolvedAt ? iso(row.resolvedAt) : undefined,
    resolution: row.resolution ?? undefined
  };
}

async function mapSettlementRun(row: SettlementRunRow): Promise<SettlementRunRecord> {
  return {
    id: row.id,
    periodCode: row.periodCode,
    departmentId: row.departmentId,
    departmentName: row.departmentName ?? row.departmentId,
    runNo: row.runNo,
    status: row.status,
    snapshot: await buildSnapshotFromRun(row.id),
    calculatedBy: row.calculatedBy,
    calculatedAt: iso(row.calculatedAt),
    submittedBy: row.submittedBy ?? undefined,
    submittedAt: row.submittedAt ? iso(row.submittedAt) : undefined,
    approvedBy: row.approvedBy ?? undefined,
    approvedAt: row.approvedAt ? iso(row.approvedAt) : undefined,
    rejectedBy: row.rejectedBy ?? undefined,
    rejectedAt: row.rejectedAt ? iso(row.rejectedAt) : undefined,
    rejectionReason: row.rejectionReason ?? undefined
  };
}

function mapAdjustmentRow(row: AdjustmentRow): CommissionAdjustmentRecord {
  return {
    id: row.id,
    periodCode: row.periodCode,
    userId: row.userId,
    departmentId: row.departmentId,
    adjustmentType: row.adjustmentType,
    amountCents: toNumber(row.amountCents),
    direction: row.direction,
    reason: row.reason,
    evidenceUrl: row.evidenceUrl ?? undefined,
    status: row.status,
    requestedBy: row.requestedBy,
    requestedAt: iso(row.requestedAt),
    approvedBy: row.approvedBy ?? undefined,
    approvedAt: row.approvedAt ? iso(row.approvedAt) : undefined,
    appliedRunId: row.appliedRunId ?? undefined,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt)
  };
}

function mapReopenRequestRow(row: ReopenRequestRow): PeriodReopenRequestRecord {
  return {
    id: row.id,
    periodCode: row.periodCode,
    requestedBy: row.requestedBy,
    requestedAt: iso(row.requestedAt),
    reason: row.reason,
    status: row.status,
    approvedBy: row.approvedBy ?? undefined,
    approvedAt: row.approvedAt ? iso(row.approvedAt) : undefined
  };
}

function mapReportRow(row: ReportRow): TrialRunReportRecord {
  const issueSummary = parseJson<Record<string, number>>(row.issueSummary, {});
  return {
    id: row.id,
    trialRunId: row.trialRunId,
    trialRunName: row.trialRunName ?? row.trialRunId,
    periodCode: row.periodCode,
    departmentName: row.departmentName ?? row.departmentName ?? "",
    gitCommit: row.gitCommit,
    dataSources: splitList(row.dataSourceSummary),
    importBatchIds: splitList(row.importBatchSummary ?? ""),
    trialRunRunNos: splitList(row.trialRunRunNos),
    approvalRunNo: row.approvalRunNo,
    targetAmountCents: toNumber(row.targetAmountCents),
    confirmedRevenueAmountCents: toNumber(row.confirmedRevenueAmountCents),
    achievementRateBps: toNumber(row.achievementRateBps),
    commissionPoolCents: toNumber(row.commissionPoolCents),
    currentPayoutTotalCents: toNumber(row.currentPayoutTotalCents),
    futurePayoutTotalCents: toNumber(row.futurePayoutTotalCents),
    adjustmentTotalCents: toNumber(row.adjustmentTotalCents),
    frozenTotalCents: toNumber(row.frozenTotalCents),
    issueCount: issueSummary.total ?? 0,
    resolvedIssueCount: issueSummary.resolved ?? 0,
    openIssueCount: issueSummary.open ?? 0,
    result: row.result,
    acceptedBy: row.acceptedBy,
    acceptedAt: iso(row.acceptedAt),
    markdown: row.markdown
  };
}

function mapExportRow(row: {
  id: string;
  settlementRunId: string;
  runNo: string;
  periodCode: string;
  exportType: "XLSX";
  fileName: string;
  exportedBy: string;
  exportedAt: string | Date;
}): CommissionExportBinding {
  return {
    id: row.id,
    settlementRunId: row.settlementRunId,
    runNo: row.runNo,
    periodCode: row.periodCode,
    exportType: row.exportType,
    fileName: row.fileName,
    exportedBy: row.exportedBy,
    exportedAt: iso(row.exportedAt)
  };
}

async function buildSnapshotFromRun(runId: string): Promise<SettlementSnapshotResult> {
  const client = await db();
  const rows = await client.$queryRawUnsafe<SettlementRunRow[]>(
    `SELECT csr.*, p.periodCode, d.name AS departmentName
       FROM CommissionSettlementRun csr
       JOIN CommissionPeriod p ON p.id = csr.periodId
       LEFT JOIN Department d ON d.id = csr.departmentId
      WHERE csr.id = ?`,
    runId
  );
  const row = rows[0];
  if (!row) {
    throw new DbWorkflowError("SETTLEMENT_RUN_NOT_FOUND", { runId });
  }
  const lines = await client.$queryRawUnsafe<SettlementLineRow[]>(
    `SELECT csl.*, e.name AS employeeName
       FROM CommissionSettlementLine csl
       LEFT JOIN Employee e ON e.id = csl.userId
      WHERE csl.settlementRunId = ?
      ORDER BY csl.userId ASC`,
    runId
  );
  const deposits = await client.$queryRawUnsafe<Array<{ countValue: number | bigint }>>(
    `SELECT COUNT(*) AS countValue
       FROM DepositLedger
      WHERE periodId = ? AND refundStatus = 'DISPUTED'`,
    row.periodId
  );
  return {
    periodCode: row.periodCode,
    departmentId: row.departmentId,
    targetAmountCents: toNumber(row.targetAmountCents),
    confirmedRevenueAmountCents: toNumber(row.confirmedRevenueAmountCents),
    ownedVehicleRevenueAmountCents: toNumber(row.ownedVehicleRevenueAmountCents),
    externalProfitAmountCents: toNumber(row.externalProfitAmountCents),
    historicalReceivableRecoveredAmountCents: toNumber(row.historicalReceivableRecoveredAmountCents),
    achievementRateBps: toNumber(row.achievementRateBps),
    appliedCommissionRateBps: toNumber(row.appliedCommissionRateBps),
    departmentCommissionPoolCents: toNumber(row.departmentCommissionPoolCents),
    depositRiskCount: toNumber(deposits[0]?.countValue),
    lines: lines.map((line) => ({
      userId: line.userId,
      contributionAmountCents: toNumber(line.confirmedContributionAmountCents),
      confirmedContributionAmountCents: toNumber(line.confirmedContributionAmountCents),
      contributionRateBps: toNumber(line.contributionRateBps),
      employeeName: line.employeeName ?? line.userId,
      roleInSettlement: line.roleInSettlement,
      grossCommissionCents: toNumber(line.grossCommissionCents),
      currentPayoutCents: toNumber(line.currentPayoutCents),
      quarterlyDeferredCents: toNumber(line.quarterlyDeferredCents),
      yearEndDeferredCents: toNumber(line.yearEndDeferredCents),
      otherDeferredCents: toNumber(line.otherDeferredCents),
      futurePayoutCents: toNumber(line.futurePayoutCents),
      frozenAmountCents: toNumber(line.frozenAmountCents),
      adjustmentAmountCents: toNumber(line.adjustmentAmountCents),
      finalCurrentPayableCents: toNumber(line.finalCurrentPayableCents),
      remark: line.remark ?? ""
    }))
  };
}

async function findPeriod(client: RawDbClient, input: { periodId?: string; periodCode?: string }): Promise<PeriodRow> {
  if (input.periodId) {
    return getRequiredPeriod(client, input.periodId);
  }
  if (!input.periodCode) {
    throw new DbWorkflowError("RECORD_NOT_FOUND", { id: "periodId or periodCode" });
  }
  const rows = await client.$queryRawUnsafe<PeriodRow[]>(
    `SELECT * FROM CommissionPeriod WHERE periodCode = ? ORDER BY createdAt DESC LIMIT 1`,
    input.periodCode
  );
  if (!rows[0]) {
    throw new DbWorkflowError("RECORD_NOT_FOUND", { id: input.periodCode });
  }
  return rows[0];
}

async function getRequiredPeriod(client: RawDbClient, periodId: string): Promise<PeriodRow> {
  const rows = await client.$queryRawUnsafe<PeriodRow[]>(`SELECT * FROM CommissionPeriod WHERE id = ?`, periodId);
  if (!rows[0]) {
    throw new DbWorkflowError("RECORD_NOT_FOUND", { id: periodId });
  }
  return rows[0];
}

async function getPeriodIdByCode(client: RawDbClient, periodCode: string): Promise<string> {
  return (await findPeriod(client, { periodCode })).id;
}

async function findRuleSet(client: RawDbClient, departmentId: string): Promise<{ id: string }> {
  const rows = await client.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM CommissionRuleSet
      WHERE departmentId = ? AND status = 'ACTIVE'
      ORDER BY effectiveFrom DESC
      LIMIT 1`,
    departmentId
  );
  if (!rows[0]) {
    throw new DbWorkflowError("RECORD_NOT_FOUND", { id: `active rule set for ${departmentId}` });
  }
  return rows[0];
}

async function buildApprovedAdjustmentMap(client: RawDbClient, periodId: string): Promise<Record<string, number>> {
  const rows = await client.$queryRawUnsafe<Array<{ userId: string; amountCents: number; direction: AdjustmentDirection }>>(
    `SELECT userId, amountCents, direction
       FROM CommissionAdjustment
      WHERE periodId = ? AND status IN ('APPROVED', 'APPLIED')`,
    periodId
  );
  return rows.reduce<Record<string, number>>((acc, row) => {
    const signed = row.direction === "ADD" ? toNumber(row.amountCents) : -toNumber(row.amountCents);
    acc[row.userId] = (acc[row.userId] ?? 0) + signed;
    return acc;
  }, {});
}

async function buildNextRunNo(client: RawDbClient, periodId: string, periodCode: string): Promise<string> {
  const rows = await client.$queryRawUnsafe<Array<{ runNo: string }>>(
    `SELECT runNo FROM CommissionSettlementRun WHERE periodId = ?`,
    periodId
  );
  const next =
    rows.reduce((max, row) => {
      const match = runNoPattern.exec(row.runNo);
      return Math.max(max, match ? Number(match[1]) : 0);
    }, 0) + 1;
  return `${periodCode}-RUN-${String(next).padStart(3, "0")}`;
}

async function getRequiredTrialRun(client: RawDbClient, id: string): Promise<TrialRunRecord> {
  const rows = await client.$queryRawUnsafe<TrialRunRow[]>(
    `SELECT tr.*, p.periodCode
       FROM TrialRun tr
       JOIN CommissionPeriod p ON p.id = tr.periodId
      WHERE tr.id = ?`,
    id
  );
  if (!rows[0]) {
    throw new DbWorkflowError("TRIAL_RUN_NOT_FOUND", { trialRunId: id });
  }
  return mapTrialRunRow(rows[0]);
}

async function listTrialRunIssues(trialRunId: string): Promise<TrialRunIssueRecord[]> {
  const rows = await (await db()).$queryRawUnsafe<TrialRunIssueRow[]>(
    `SELECT * FROM TrialRunIssue WHERE trialRunId = ? ORDER BY createdAt ASC`,
    trialRunId
  );
  return rows.map(mapIssueRow);
}

async function getRequiredIssue(client: RawDbClient, id: string): Promise<TrialRunIssueRecord> {
  const rows = await client.$queryRawUnsafe<TrialRunIssueRow[]>(`SELECT * FROM TrialRunIssue WHERE id = ?`, id);
  if (!rows[0]) {
    throw new DbWorkflowError("RECORD_NOT_FOUND", { id });
  }
  return mapIssueRow(rows[0]);
}

async function getRequiredAdjustment(client: RawDbClient, id: string): Promise<CommissionAdjustmentRecord> {
  const rows = await client.$queryRawUnsafe<AdjustmentRow[]>(
    `SELECT ca.*, p.periodCode
       FROM CommissionAdjustment ca
       JOIN CommissionPeriod p ON p.id = ca.periodId
      WHERE ca.id = ?`,
    id
  );
  if (!rows[0]) {
    throw new DbWorkflowError("RECORD_NOT_FOUND", { id });
  }
  return mapAdjustmentRow(rows[0]);
}

async function getRequiredSettlementRun(client: RawDbClient, id: string): Promise<SettlementRunRecord> {
  const rows = await client.$queryRawUnsafe<SettlementRunRow[]>(
    `SELECT csr.*, p.periodCode, d.name AS departmentName
       FROM CommissionSettlementRun csr
       JOIN CommissionPeriod p ON p.id = csr.periodId
       LEFT JOIN Department d ON d.id = csr.departmentId
      WHERE csr.id = ?`,
    id
  );
  if (!rows[0]) {
    throw new DbWorkflowError("SETTLEMENT_RUN_NOT_FOUND", { runId: id });
  }
  return mapSettlementRun(rows[0]);
}

async function listSettlementRunsForPeriod(periodId: string): Promise<SettlementRunRecord[]> {
  const rows = await (await db()).$queryRawUnsafe<SettlementRunRow[]>(
    `SELECT csr.*, p.periodCode, d.name AS departmentName
       FROM CommissionSettlementRun csr
       JOIN CommissionPeriod p ON p.id = csr.periodId
       LEFT JOIN Department d ON d.id = csr.departmentId
      WHERE csr.periodId = ?
      ORDER BY csr.calculatedAt ASC`,
    periodId
  );
  return Promise.all(rows.map((row) => mapSettlementRun(row)));
}

async function listTrialRunReports(trialRunId: string): Promise<TrialRunReportRecord[]> {
  const rows = await (await db()).$queryRawUnsafe<ReportRow[]>(
    `SELECT trr.*, tr.name AS trialRunName, p.periodCode, d.name AS departmentName
       FROM TrialRunReport trr
       JOIN TrialRun tr ON tr.id = trr.trialRunId
       JOIN CommissionPeriod p ON p.id = trr.periodId
       LEFT JOIN Department d ON d.id = trr.departmentId
      WHERE trr.trialRunId = ?
      ORDER BY trr.createdAt DESC`,
    trialRunId
  );
  return rows.map(mapReportRow);
}

async function getRequiredReport(client: RawDbClient, id: string): Promise<TrialRunReportRecord> {
  const rows = await client.$queryRawUnsafe<ReportRow[]>(
    `SELECT trr.*, tr.name AS trialRunName, p.periodCode, d.name AS departmentName
       FROM TrialRunReport trr
       JOIN TrialRun tr ON tr.id = trr.trialRunId
       JOIN CommissionPeriod p ON p.id = trr.periodId
       LEFT JOIN Department d ON d.id = trr.departmentId
      WHERE trr.id = ?`,
    id
  );
  if (!rows[0]) {
    throw new DbWorkflowError("RECORD_NOT_FOUND", { id });
  }
  return mapReportRow(rows[0]);
}

async function getRequiredReopenRequest(client: RawDbClient, id: string): Promise<PeriodReopenRequestRecord> {
  const rows = await client.$queryRawUnsafe<ReopenRequestRow[]>(
    `SELECT prr.*, p.periodCode
       FROM PeriodReopenRequest prr
       JOIN CommissionPeriod p ON p.id = prr.periodId
      WHERE prr.id = ?`,
    id
  );
  if (!rows[0]) {
    throw new DbWorkflowError("RECORD_NOT_FOUND", { id });
  }
  return mapReopenRequestRow(rows[0]);
}

async function getRequiredExportBinding(client: RawDbClient, id: string): Promise<CommissionExportBinding> {
  const rows = await client.$queryRawUnsafe<
    Array<{
      id: string;
      settlementRunId: string;
      runNo: string;
      periodCode: string;
      exportType: "XLSX";
      fileName: string;
      exportedBy: string;
      exportedAt: string | Date;
    }>
  >(
    `SELECT cer.id, cer.settlementRunId, csr.runNo, p.periodCode, cer.exportType, cer.fileName, cer.exportedBy, cer.exportedAt
       FROM CommissionExportRecord cer
       JOIN CommissionSettlementRun csr ON csr.id = cer.settlementRunId
       JOIN CommissionPeriod p ON p.id = csr.periodId
      WHERE cer.id = ?`,
    id
  );
  if (!rows[0]) {
    throw new DbWorkflowError("RECORD_NOT_FOUND", { id });
  }
  return mapExportRow(rows[0]);
}

async function getPeriodIdForRun(client: RawDbClient, runId: string): Promise<string> {
  const rows = await client.$queryRawUnsafe<Array<{ periodId: string }>>(
    `SELECT periodId FROM CommissionSettlementRun WHERE id = ?`,
    runId
  );
  if (!rows[0]) {
    throw new DbWorkflowError("SETTLEMENT_RUN_NOT_FOUND", { runId });
  }
  return rows[0].periodId;
}

async function countOpenBlockerIssues(client: RawDbClient, periodCode: string): Promise<number> {
  const rows = await client.$queryRawUnsafe<Array<{ countValue: number | bigint }>>(
    `SELECT COUNT(*) AS countValue
       FROM TrialRunIssue tri
       JOIN TrialRun tr ON tr.id = tri.trialRunId
       JOIN CommissionPeriod p ON p.id = tr.periodId
      WHERE p.periodCode = ? AND tri.severity = 'BLOCKER' AND tri.status IN ('OPEN', 'FIXING')`,
    periodCode
  );
  return toNumber(rows[0]?.countValue);
}

async function countPendingAdjustments(client: RawDbClient, runId: string): Promise<number> {
  const periodId = await getPeriodIdForRun(client, runId);
  const rows = await client.$queryRawUnsafe<Array<{ countValue: number | bigint }>>(
    `SELECT COUNT(*) AS countValue
       FROM CommissionAdjustment
      WHERE periodId = ? AND status IN ('DRAFT', 'SUBMITTED')`,
    periodId
  );
  return toNumber(rows[0]?.countValue);
}

async function listCommittedImportBatches(client: RawDbClient): Promise<Array<{ id: string; importType: string; fileName: string }>> {
  return client.$queryRawUnsafe<Array<{ id: string; importType: string; fileName: string }>>(
    `SELECT id, importType, fileName FROM ImportBatch WHERE status = 'COMMITTED' ORDER BY committedAt ASC, createdAt ASC`
  );
}

async function sumColumn(client: RawDbClient, table: string, column: string, periodId: string): Promise<number> {
  const rows = await client.$queryRawUnsafe<Array<{ total: number | bigint | null }>>(
    `SELECT COALESCE(SUM(${column}), 0) AS total FROM ${table} WHERE periodId = ?`,
    periodId
  );
  return toNumber(rows[0]?.total);
}

async function sumQuery(client: RawDbClient, query: string, ...values: unknown[]): Promise<number> {
  const rows = await client.$queryRawUnsafe<Array<{ total: number | bigint | null }>>(query, ...values);
  return toNumber(rows[0]?.total);
}

async function countRows(client: RawDbClient, query: string, ...values: unknown[]): Promise<number> {
  const rows = await client.$queryRawUnsafe<Array<{ countValue: number | bigint }>>(query, ...values);
  return toNumber(rows[0]?.countValue);
}

async function writeApprovalLog(
  client: RawDbClient,
  targetType: string,
  targetId: string,
  action: string,
  operatorId: string,
  operatorRole: string,
  comment: string
) {
  await client.$executeRawUnsafe(
    `INSERT INTO CommissionApprovalLog (id, targetType, targetId, action, operatorId, operatorRole, comment, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    createId("approval-log"),
    targetType,
    targetId,
    action,
    operatorId,
    operatorRole,
    comment,
    nowIso()
  );
}

function buildDiff(previousRun: SettlementRunRecord, nextRun: SettlementRunRecord): SettlementRunDiff {
  const previous = previousRun.snapshot;
  const next = nextRun.snapshot;
  const userIds = [...new Set([...previous.lines.map((line) => line.userId), ...next.lines.map((line) => line.userId)])];
  return {
    fromRunNo: previousRun.runNo,
    toRunNo: nextRun.runNo,
    summary: {
      targetAmountCents: diffAmount(previous.targetAmountCents, next.targetAmountCents),
      ownedVehicleRevenueAmountCents: diffAmount(previous.ownedVehicleRevenueAmountCents, next.ownedVehicleRevenueAmountCents),
      externalProfitAmountCents: diffAmount(previous.externalProfitAmountCents, next.externalProfitAmountCents),
      historicalReceivableRecoveredAmountCents: diffAmount(
        previous.historicalReceivableRecoveredAmountCents,
        next.historicalReceivableRecoveredAmountCents
      ),
      confirmedRevenueAmountCents: diffAmount(previous.confirmedRevenueAmountCents, next.confirmedRevenueAmountCents),
      achievementRateBps: diffAmount(previous.achievementRateBps, next.achievementRateBps),
      appliedCommissionRateBps: diffAmount(previous.appliedCommissionRateBps, next.appliedCommissionRateBps),
      departmentCommissionPoolCents: diffAmount(previous.departmentCommissionPoolCents, next.departmentCommissionPoolCents)
    },
    lines: userIds.map((userId) => {
      const before = previous.lines.find((line) => line.userId === userId);
      const after = next.lines.find((line) => line.userId === userId);
      return {
        userId,
        employeeName: after?.employeeName ?? before?.employeeName ?? userId,
        confirmedContributionAmountCents: diffAmount(
          before?.confirmedContributionAmountCents ?? 0,
          after?.confirmedContributionAmountCents ?? 0
        ),
        contributionRateBps: diffAmount(before?.contributionRateBps ?? 0, after?.contributionRateBps ?? 0),
        grossCommissionCents: diffAmount(before?.grossCommissionCents ?? 0, after?.grossCommissionCents ?? 0),
        currentPayoutCents: diffAmount(before?.currentPayoutCents ?? 0, after?.currentPayoutCents ?? 0),
        futurePayoutCents: diffAmount(before?.futurePayoutCents ?? 0, after?.futurePayoutCents ?? 0),
        frozenAmountCents: diffAmount(before?.frozenAmountCents ?? 0, after?.frozenAmountCents ?? 0),
        adjustmentAmountCents: diffAmount(before?.adjustmentAmountCents ?? 0, after?.adjustmentAmountCents ?? 0)
      };
    })
  };
}

function buildReportRecord(
  detail: TrialRunDetail,
  approvedRun: SettlementRunRecord,
  importBatchIds: string[],
  gitCommit: string,
  acceptedBy: string,
  acceptedAt: string,
  result: TrialRunResult,
  issueSummary: string,
  residualRiskSummary: string
): TrialRunReportRecord {
  const snapshot = approvedRun.snapshot;
  const report: TrialRunReportRecord = {
    id: "pending",
    trialRunId: detail.trialRun.id,
    trialRunName: detail.trialRun.name,
    periodCode: detail.trialRun.periodCode,
    departmentName: detail.departmentName,
    gitCommit,
    dataSources: ["DB ledger", "ImportBatch", "manual adjustments"],
    importBatchIds,
    trialRunRunNos: detail.settlementRuns.map((run) => run.runNo),
    approvalRunNo: approvedRun.runNo,
    targetAmountCents: snapshot.targetAmountCents,
    confirmedRevenueAmountCents: snapshot.confirmedRevenueAmountCents,
    achievementRateBps: snapshot.achievementRateBps,
    commissionPoolCents: snapshot.departmentCommissionPoolCents,
    currentPayoutTotalCents: sumCents(snapshot.lines.map((line) => line.currentPayoutCents)),
    futurePayoutTotalCents: sumCents(snapshot.lines.map((line) => line.futurePayoutCents)),
    adjustmentTotalCents: sumCents(snapshot.lines.map((line) => line.adjustmentAmountCents)),
    frozenTotalCents: sumCents(snapshot.lines.map((line) => line.frozenAmountCents)),
    issueCount: detail.issues.length,
    resolvedIssueCount: detail.issues.filter((issue) => issue.status === "RESOLVED").length,
    openIssueCount: detail.issues.filter((issue) => ["OPEN", "FIXING"].includes(issue.status)).length,
    result,
    acceptedBy,
    acceptedAt,
    markdown: ""
  };
  report.markdown = [
    `# ${detail.trialRun.name}`,
    "",
    `- Period: ${detail.trialRun.periodCode}`,
    `- Department: ${detail.departmentName}`,
    `- Git commit: ${gitCommit}`,
    `- Trial runNos: ${report.trialRunRunNos.join(", ")}`,
    `- Approved runNo: ${approvedRun.runNo}`,
    `- Result: ${result}`,
    `- Accepted by: ${acceptedBy}`,
    `- Accepted at: ${acceptedAt}`,
    "",
    "## Settlement",
    `- Target cents: ${report.targetAmountCents}`,
    `- Confirmed revenue cents: ${report.confirmedRevenueAmountCents}`,
    `- Commission pool cents: ${report.commissionPoolCents}`,
    `- Current payout cents: ${report.currentPayoutTotalCents}`,
    `- Future payout cents: ${report.futurePayoutTotalCents}`,
    "",
    "## Issues",
    issueSummary,
    "",
    "## Residual Risk",
    residualRiskSummary || "None"
  ].join("\n");
  return report;
}

function summarizeIssues(issues: TrialRunIssueRecord[]): string {
  return JSON.stringify({
    total: issues.length,
    resolved: issues.filter((issue) => issue.status === "RESOLVED").length,
    open: issues.filter((issue) => ["OPEN", "FIXING"].includes(issue.status)).length,
    acceptedRisk: issues.filter((issue) => issue.status === "ACCEPTED_RISK").length
  });
}

function deriveTrialRunResult(issues: TrialRunIssueRecord[]): TrialRunResult {
  if (issues.some((issue) => issue.severity === "BLOCKER" && ["OPEN", "FIXING"].includes(issue.status))) {
    return "FAIL";
  }
  if (issues.some((issue) => issue.status === "ACCEPTED_RISK" || ["OPEN", "FIXING"].includes(issue.status))) {
    return "PASS_WITH_LIMITATIONS";
  }
  return "PASS";
}

async function cleanupRealPeriodFixture(client: RawDbClient, periodId: string, departmentId: string) {
  await client.$executeRawUnsafe(
    `DELETE FROM TrialRunIssue WHERE trialRunId IN (SELECT id FROM TrialRun WHERE periodId = ?)`,
    periodId
  );
  await client.$executeRawUnsafe(`DELETE FROM TrialRunReport WHERE periodId = ?`, periodId);
  await client.$executeRawUnsafe(`DELETE FROM TrialRun WHERE periodId = ?`, periodId);
  await client.$executeRawUnsafe(
    `DELETE FROM CommissionExportRecord WHERE settlementRunId IN (SELECT id FROM CommissionSettlementRun WHERE periodId = ?)`,
    periodId
  );
  await client.$executeRawUnsafe(
    `DELETE FROM CommissionSettlementLine WHERE settlementRunId IN (SELECT id FROM CommissionSettlementRun WHERE periodId = ?)`,
    periodId
  );
  await client.$executeRawUnsafe(`DELETE FROM CommissionSettlementRun WHERE periodId = ?`, periodId);
  await client.$executeRawUnsafe(`DELETE FROM CommissionAdjustment WHERE periodId = ?`, periodId);
  await client.$executeRawUnsafe(`DELETE FROM PeriodReopenRequest WHERE periodId = ?`, periodId);
  await client.$executeRawUnsafe(`DELETE FROM CommissionApprovalLog WHERE targetId LIKE 'settlement-run-%'`);
  await client.$executeRawUnsafe(`DELETE FROM TargetAdjustmentRequest WHERE periodId = ?`, periodId);
  await client.$executeRawUnsafe(`DELETE FROM VehicleStatusEvent WHERE periodId = ?`, periodId);
  await client.$executeRawUnsafe(`DELETE FROM ReceivableSnapshot WHERE periodId = ?`, periodId);
  await client.$executeRawUnsafe(`DELETE FROM DepositLedger WHERE periodId = ?`, periodId);
  await client.$executeRawUnsafe(`DELETE FROM ExternalProfitReceipt WHERE periodId = ?`, periodId);
  await client.$executeRawUnsafe(`DELETE FROM RevenueReceiptLedger WHERE periodId = ?`, periodId);
  await client.$executeRawUnsafe(`DELETE FROM LeaseOrderLedger WHERE periodId = ?`, periodId);
  await client.$executeRawUnsafe(`DELETE FROM CommissionTarget WHERE periodId = ?`, periodId);
  await client.$executeRawUnsafe(`DELETE FROM CommissionPeriod WHERE id = ?`, periodId);
  await client.$executeRawUnsafe(
    `DELETE FROM CommissionPayoutRule WHERE ruleSetId IN (SELECT id FROM CommissionRuleSet WHERE departmentId = ?)`,
    departmentId
  );
  await client.$executeRawUnsafe(
    `DELETE FROM CommissionTierRule WHERE ruleSetId IN (SELECT id FROM CommissionRuleSet WHERE departmentId = ?)`,
    departmentId
  );
  await client.$executeRawUnsafe(`DELETE FROM CommissionRuleSet WHERE departmentId = ?`, departmentId);
  await client.$executeRawUnsafe(`DELETE FROM ImportBatchRow WHERE batchId LIKE 'real-import-%-202605'`);
  await client.$executeRawUnsafe(`DELETE FROM ImportBatch WHERE id LIKE 'real-import-%-202605'`);
  await client.$executeRawUnsafe(`DELETE FROM Employee WHERE departmentId = ?`, departmentId);
  await client.$executeRawUnsafe(`DELETE FROM Vehicle WHERE id LIKE 'real-vehicle-%'`);
  await client.$executeRawUnsafe(`DELETE FROM Department WHERE id = ?`, departmentId);
}

function diffAmount(before: number, after: number) {
  return { before, after, deltaCents: after - before };
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function iso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
