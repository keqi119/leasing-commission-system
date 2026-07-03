import {
  acceptanceDepartmentName,
  type CommissionSettlementInput,
  type SettlementSnapshotResult,
  type SettlementStatus
} from "@lcs/commission-engine";
import { calculateCommissionSettlement } from "@lcs/commission-engine";
import {
  buildCommissionInputFromImportDraft,
  createDefaultImportContext,
  type ImportContext
} from "./imports";

type TrialRunStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
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
type AdjustmentStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "APPLIED";
type AdjustmentType =
  | "DATA_CORRECTION"
  | "BOSS_DECISION"
  | "RECEIVABLE_FREEZE"
  | "DEPOSIT_RISK"
  | "SPECIAL_REWARD"
  | "SPECIAL_DEDUCTION"
  | "ROUNDING_CORRECTION"
  | "OTHER";
type PeriodReopenStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface SettlementRunRecord {
  id: string;
  periodCode: string;
  departmentId: string;
  departmentName: string;
  runNo: string;
  status: SettlementStatus;
  snapshot: SettlementSnapshotResult;
  calculatedBy: string;
  calculatedAt: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  basedOnRunId?: string;
}

export interface TrialRunRecord {
  id: string;
  periodCode: string;
  departmentId: string;
  name: string;
  status: TrialRunStatus;
  startedBy: string;
  startedAt: string;
  completedBy?: string;
  completedAt?: string;
  result?: TrialRunResult;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrialRunIssueRecord {
  id: string;
  trialRunId: string;
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  description: string;
  ownerRole: string;
  status: IssueStatus;
  createdBy: string;
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface CommissionAdjustmentRecord {
  id: string;
  periodCode: string;
  userId: string;
  departmentId: string;
  adjustmentType: AdjustmentType;
  amountCents: number;
  direction: AdjustmentDirection;
  reason: string;
  evidenceUrl?: string;
  status: AdjustmentStatus;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  appliedRunId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionExportBinding {
  id: string;
  settlementRunId: string;
  runNo: string;
  periodCode: string;
  exportType: "XLSX";
  fileName: string;
  exportedBy: string;
  exportedAt: string;
}

export interface PeriodReopenRequestRecord {
  id: string;
  periodCode: string;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  status: PeriodReopenStatus;
  approvedBy?: string;
  approvedAt?: string;
}

export interface TrialRunReportRecord {
  id: string;
  trialRunId: string;
  trialRunName: string;
  periodCode: string;
  departmentName: string;
  gitCommit: string;
  dataSources: string[];
  importBatchIds: string[];
  trialRunRunNos: string[];
  approvalRunNo: string;
  targetAmountCents: number;
  confirmedRevenueAmountCents: number;
  achievementRateBps: number;
  commissionPoolCents: number;
  currentPayoutTotalCents: number;
  futurePayoutTotalCents: number;
  adjustmentTotalCents: number;
  frozenTotalCents: number;
  issueCount: number;
  resolvedIssueCount: number;
  openIssueCount: number;
  result: TrialRunResult;
  acceptedBy: string;
  acceptedAt: string;
  markdown: string;
}

export interface SettlementRunDiff {
  fromRunNo: string;
  toRunNo: string;
  summary: Record<string, DiffAmount>;
  lines: Array<{
    userId: string;
    employeeName: string;
    confirmedContributionAmountCents: DiffAmount;
    contributionRateBps: DiffAmount;
    grossCommissionCents: DiffAmount;
    currentPayoutCents: DiffAmount;
    futurePayoutCents: DiffAmount;
    frozenAmountCents: DiffAmount;
    adjustmentAmountCents: DiffAmount;
  }>;
}

export interface DiffAmount {
  before: number;
  after: number;
  deltaCents: number;
}

export interface TrialRunWorkflowStore {
  importContext: ImportContext;
  settlementRuns: SettlementRunRecord[];
  adjustments: CommissionAdjustmentRecord[];
  trialRuns: TrialRunRecord[];
  issues: TrialRunIssueRecord[];
  reports: TrialRunReportRecord[];
  exports: CommissionExportBinding[];
  reopenRequests: PeriodReopenRequestRecord[];
  addApprovedRevenueReceipt: (receipt: ImportContext["revenueReceipts"][number]) => void;
}

export function createTrialRunWorkflowStore(): TrialRunWorkflowStore {
  const importContext = createDefaultImportContext();

  return {
    importContext,
    settlementRuns: [],
    adjustments: [],
    trialRuns: [],
    issues: [],
    reports: [],
    exports: [],
    reopenRequests: [],
    addApprovedRevenueReceipt(receipt) {
      importContext.revenueReceipts.push(receipt);
    }
  };
}

export function createSampleTrialRunWorkflowStore(): TrialRunWorkflowStore {
  const store = createTrialRunWorkflowStore();
  const trialRun = createTrialRun(store, {
    periodCode: "2026-04",
    name: "2026-04 真实账期试运行",
    startedBy: "hr-1",
    startedAt: "2026-05-05T09:00:00.000Z"
  });
  const issue = createTrialRunIssue(store, {
    trialRunId: trialRun.id,
    severity: "MAJOR",
    category: "REVENUE",
    title: "补审租金收入后需要重算",
    description: "财务补审销售 B 的 12,000 元租金收入，HR 需要生成新版本 run。",
    ownerRole: "FINANCE",
    createdBy: "hr-1"
  });
  const runV1 = recalculateSettlementRun(store, {
    periodCode: "2026-04",
    calculatedBy: "hr-1",
    calculatedAt: "2026-05-05T09:10:00.000Z"
  });
  submitSettlementRun(store, runV1.id, {
    submittedBy: "hr-1",
    submittedAt: "2026-05-05T09:20:00.000Z"
  });
  rejectSettlementRun(store, runV1.id, {
    rejectedBy: "boss-1",
    reason: "财务补审收入后重算",
    rejectedAt: "2026-05-05T10:00:00.000Z"
  });
  store.addApprovedRevenueReceipt({
    id: "sample-rev-fix-202604-b",
    periodCode: "2026-04",
    orderNo: "ACC-202604-B-OWNED",
    salesUserId: "B",
    receiptAmountCents: 1200000,
    receiptDate: "2026-04-21",
    companyAccount: "公司账户",
    financeReviewStatus: "APPROVED",
    revenueKind: "OWNED_RENT",
    isCommissionable: true,
    remark: "真实账期补审收入",
    dataSource: "MANUAL"
  });
  resolveTrialRunIssue(store, issue.id, {
    resolvedBy: "finance-1",
    resolvedAt: "2026-05-05T10:30:00.000Z",
    resolution: "收入已补审，HR 已基于修正数据重新试算。"
  });
  const adjustment = createAdjustment(store, {
    periodCode: "2026-04",
    userId: "A",
    adjustmentType: "SPECIAL_REWARD",
    amountCents: 50000,
    direction: "ADD",
    reason: "试运行专项奖励",
    requestedBy: "hr-1"
  });
  submitAdjustment(store, adjustment.id, { submittedBy: "hr-1" });
  approveAdjustment(store, adjustment.id, {
    approvedBy: "boss-1",
    approvedAt: "2026-05-05T11:00:00.000Z"
  });
  const runV2 = recalculateSettlementRun(store, {
    periodCode: "2026-04",
    calculatedBy: "hr-1",
    calculatedAt: "2026-05-05T11:10:00.000Z",
    basedOnRunId: runV1.id
  });
  submitSettlementRun(store, runV2.id, {
    submittedBy: "hr-1",
    submittedAt: "2026-05-05T11:20:00.000Z"
  });
  approveSettlementRun(store, runV2.id, {
    approvedBy: "boss-1",
    approvedAt: "2026-05-06T09:00:00.000Z"
  });
  exportApprovedSettlementRun(store, runV2.id, {
    exportedBy: "hr-1",
    exportedAt: "2026-05-06T09:30:00.000Z"
  });
  completeTrialRun(store, trialRun.id, {
    completedBy: "hr-1",
    completedAt: "2026-05-06T10:00:00.000Z",
    result: "PASS_WITH_LIMITATIONS",
    summary: "试运行闭环完成，补审收入、人工调整、审批和导出均已留痕。"
  });
  generateTrialRunReport(store, trialRun.id, {
    gitCommit: "local-sample",
    acceptedBy: "老板",
    acceptedAt: "2026-05-06T10:30:00.000Z"
  });
  return store;
}

export function recalculateSettlementRun(
  store: TrialRunWorkflowStore,
  options: { periodCode: string; calculatedBy: string; calculatedAt?: string; basedOnRunId?: string }
): SettlementRunRecord {
  const input = buildSettlementInputWithAdjustments(store, options.periodCode);
  const snapshot = calculateCommissionSettlement(input);
  const runNo = buildNextRunNo(store, options.periodCode);
  const run: SettlementRunRecord = {
    id: `settlement-${runNo}`,
    periodCode: options.periodCode,
    departmentId: snapshot.departmentId,
    departmentName: acceptanceDepartmentName,
    runNo,
    status: "CALCULATED",
    snapshot,
    calculatedBy: options.calculatedBy,
    calculatedAt: options.calculatedAt ?? new Date().toISOString(),
    basedOnRunId: options.basedOnRunId
  };

  store.settlementRuns.push(run);
  markApprovedAdjustmentsApplied(store, options.periodCode, run.id);
  return run;
}

export function submitSettlementRun(
  store: TrialRunWorkflowStore,
  runId: string,
  options: { submittedBy: string; submittedAt?: string }
): SettlementRunRecord {
  const run = findRun(store, runId);
  if (!["CALCULATED", "REJECTED"].includes(run.status)) {
    throw new Error("只有已试算或被驳回后重算的 run 可以提交审批");
  }
  run.status = "SUBMITTED";
  run.submittedBy = options.submittedBy;
  run.submittedAt = options.submittedAt ?? new Date().toISOString();
  return run;
}

export function rejectSettlementRun(
  store: TrialRunWorkflowStore,
  runId: string,
  options: { rejectedBy: string; reason: string; rejectedAt?: string }
): SettlementRunRecord {
  if (!options.reason.trim()) {
    throw new Error("老板驳回必须填写原因");
  }
  const run = findRun(store, runId);
  if (run.status !== "SUBMITTED") {
    throw new Error("只有已提交审批的 run 可以驳回");
  }
  run.status = "REJECTED";
  run.rejectedBy = options.rejectedBy;
  run.rejectedAt = options.rejectedAt ?? new Date().toISOString();
  run.rejectionReason = options.reason;
  return run;
}

export function approveSettlementRun(
  store: TrialRunWorkflowStore,
  runId: string,
  options: { approvedBy: string; approvedAt?: string }
): SettlementRunRecord {
  const run = findRun(store, runId);
  if (run.status !== "SUBMITTED") {
    throw new Error("只有已提交审批的 run 可以审批通过");
  }
  run.status = "APPROVED";
  run.approvedBy = options.approvedBy;
  run.approvedAt = options.approvedAt ?? new Date().toISOString();

  const period = findPeriod(store, run.periodCode);
  period.status = "BOSS_APPROVED";
  return run;
}

export function exportApprovedSettlementRun(
  store: TrialRunWorkflowStore,
  runId: string,
  options: { exportedBy: string; exportedAt?: string }
): CommissionExportBinding {
  const run = findRun(store, runId);
  if (!["APPROVED", "EXPORTED"].includes(run.status)) {
    throw new Error("只有老板审批通过的结算 run 可以导出正式发放表");
  }
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  const record: CommissionExportBinding = {
    id: `export-${store.exports.length + 1}`,
    settlementRunId: run.id,
    runNo: run.runNo,
    periodCode: run.periodCode,
    exportType: "XLSX",
    fileName: `${run.runNo}-payout.xlsx`,
    exportedBy: options.exportedBy,
    exportedAt
  };
  run.status = "EXPORTED";
  store.exports.push(record);
  return record;
}

export function getSettlementRunDiff(previousRun: SettlementRunRecord, nextRun: SettlementRunRecord): SettlementRunDiff {
  const previous = previousRun.snapshot;
  const next = nextRun.snapshot;
  const userIds = uniqueStrings([
    ...previous.lines.map((line) => line.userId),
    ...next.lines.map((line) => line.userId)
  ]);

  return {
    fromRunNo: previousRun.runNo,
    toRunNo: nextRun.runNo,
    summary: {
      targetAmountCents: diffAmount(previous.targetAmountCents, next.targetAmountCents),
      ownedVehicleRevenueAmountCents: diffAmount(
        previous.ownedVehicleRevenueAmountCents,
        next.ownedVehicleRevenueAmountCents
      ),
      externalProfitAmountCents: diffAmount(previous.externalProfitAmountCents, next.externalProfitAmountCents),
      historicalReceivableRecoveredAmountCents: diffAmount(
        previous.historicalReceivableRecoveredAmountCents,
        next.historicalReceivableRecoveredAmountCents
      ),
      confirmedRevenueAmountCents: diffAmount(previous.confirmedRevenueAmountCents, next.confirmedRevenueAmountCents),
      achievementRateBps: diffAmount(previous.achievementRateBps, next.achievementRateBps),
      appliedCommissionRateBps: diffAmount(previous.appliedCommissionRateBps, next.appliedCommissionRateBps),
      departmentCommissionPoolCents: diffAmount(
        previous.departmentCommissionPoolCents,
        next.departmentCommissionPoolCents
      )
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

export function createAdjustment(
  store: TrialRunWorkflowStore,
  input: {
    periodCode: string;
    userId: string;
    adjustmentType: AdjustmentType;
    amountCents: number;
    direction: AdjustmentDirection;
    reason: string;
    requestedBy: string;
    evidenceUrl?: string;
  }
): CommissionAdjustmentRecord {
  if (!input.reason.trim()) {
    throw new Error("人工调整必须填写原因");
  }
  if (input.amountCents <= 0) {
    throw new Error("人工调整金额必须大于 0");
  }
  const period = findPeriod(store, input.periodCode);
  const now = new Date().toISOString();
  const adjustment: CommissionAdjustmentRecord = {
    id: `adjustment-${store.adjustments.length + 1}`,
    periodCode: input.periodCode,
    userId: input.userId,
    departmentId: period.departmentId,
    adjustmentType: input.adjustmentType,
    amountCents: input.amountCents,
    direction: input.direction,
    reason: input.reason,
    evidenceUrl: input.evidenceUrl,
    status: "DRAFT",
    requestedBy: input.requestedBy,
    requestedAt: now,
    createdAt: now,
    updatedAt: now
  };
  store.adjustments.push(adjustment);
  return adjustment;
}

export function submitAdjustment(
  store: TrialRunWorkflowStore,
  adjustmentId: string,
  options: { submittedBy: string }
): CommissionAdjustmentRecord {
  const adjustment = findAdjustment(store, adjustmentId);
  if (adjustment.status !== "DRAFT") {
    throw new Error("只有草稿人工调整可以提交审批");
  }
  adjustment.status = "SUBMITTED";
  adjustment.updatedAt = new Date().toISOString();
  return adjustment;
}

export function approveAdjustment(
  store: TrialRunWorkflowStore,
  adjustmentId: string,
  options: { approvedBy: string; approvedAt?: string }
): CommissionAdjustmentRecord {
  const adjustment = findAdjustment(store, adjustmentId);
  if (adjustment.status !== "SUBMITTED") {
    throw new Error("只有已提交的人工调整可以审批通过");
  }
  adjustment.status = "APPROVED";
  adjustment.approvedBy = options.approvedBy;
  adjustment.approvedAt = options.approvedAt ?? new Date().toISOString();
  adjustment.updatedAt = adjustment.approvedAt;
  return adjustment;
}

export function requestPeriodReopen(
  store: TrialRunWorkflowStore,
  input: { periodCode: string; requestedBy: string; reason: string }
): PeriodReopenRequestRecord {
  if (!input.reason.trim()) {
    throw new Error("重开周期必须填写原因");
  }
  findPeriod(store, input.periodCode);
  const request: PeriodReopenRequestRecord = {
    id: `period-reopen-${store.reopenRequests.length + 1}`,
    periodCode: input.periodCode,
    requestedBy: input.requestedBy,
    requestedAt: new Date().toISOString(),
    reason: input.reason,
    status: "PENDING"
  };
  store.reopenRequests.push(request);
  return request;
}

export function approvePeriodReopen(
  store: TrialRunWorkflowStore,
  requestId: string,
  options: { approvedBy: string; approvedAt?: string }
): PeriodReopenRequestRecord {
  const request = store.reopenRequests.find((candidate) => candidate.id === requestId);
  if (!request) {
    throw new Error(`重开申请不存在：${requestId}`);
  }
  request.status = "APPROVED";
  request.approvedBy = options.approvedBy;
  request.approvedAt = options.approvedAt ?? new Date().toISOString();
  findPeriod(store, request.periodCode).status = "OPEN";
  return request;
}

export function createTrialRun(
  store: TrialRunWorkflowStore,
  input: { periodCode: string; name: string; startedBy: string; startedAt?: string }
): TrialRunRecord {
  const period = findPeriod(store, input.periodCode);
  const now = input.startedAt ?? new Date().toISOString();
  const trialRun: TrialRunRecord = {
    id: `trial-run-${store.trialRuns.length + 1}`,
    periodCode: input.periodCode,
    departmentId: period.departmentId,
    name: input.name,
    status: "IN_PROGRESS",
    startedBy: input.startedBy,
    startedAt: now,
    summary: "",
    createdAt: now,
    updatedAt: now
  };
  store.trialRuns.push(trialRun);
  return trialRun;
}

export function createTrialRunIssue(
  store: TrialRunWorkflowStore,
  input: {
    trialRunId: string;
    severity: IssueSeverity;
    category: IssueCategory;
    title: string;
    description: string;
    ownerRole: string;
    createdBy: string;
  }
): TrialRunIssueRecord {
  if (!store.trialRuns.some((trialRun) => trialRun.id === input.trialRunId)) {
    throw new Error(`试运行不存在：${input.trialRunId}`);
  }
  const issue: TrialRunIssueRecord = {
    id: `trial-run-issue-${store.issues.length + 1}`,
    trialRunId: input.trialRunId,
    severity: input.severity,
    category: input.category,
    title: input.title,
    description: input.description,
    ownerRole: input.ownerRole,
    status: "OPEN",
    createdBy: input.createdBy,
    createdAt: new Date().toISOString()
  };
  store.issues.push(issue);
  return issue;
}

export function resolveTrialRunIssue(
  store: TrialRunWorkflowStore,
  issueId: string,
  input: { resolvedBy: string; resolution: string; resolvedAt?: string }
): TrialRunIssueRecord {
  const issue = findIssue(store, issueId);
  issue.status = "RESOLVED";
  issue.resolvedBy = input.resolvedBy;
  issue.resolvedAt = input.resolvedAt ?? new Date().toISOString();
  issue.resolution = input.resolution;
  return issue;
}

export function completeTrialRun(
  store: TrialRunWorkflowStore,
  trialRunId: string,
  input: { completedBy: string; result: TrialRunResult; summary: string; completedAt?: string }
): TrialRunRecord {
  const trialRun = findTrialRun(store, trialRunId);
  trialRun.status = "COMPLETED";
  trialRun.completedBy = input.completedBy;
  trialRun.completedAt = input.completedAt ?? new Date().toISOString();
  trialRun.result = input.result;
  trialRun.summary = input.summary;
  trialRun.updatedAt = trialRun.completedAt;
  return trialRun;
}

export function generateTrialRunReport(
  store: TrialRunWorkflowStore,
  trialRunId: string,
  input: { gitCommit: string; acceptedBy: string; acceptedAt: string }
): TrialRunReportRecord {
  const trialRun = findTrialRun(store, trialRunId);
  if (!trialRun.result) {
    throw new Error("试运行结束后才能生成报告");
  }
  const approvedRun = [...store.settlementRuns]
    .reverse()
    .find((run) => run.periodCode === trialRun.periodCode && ["APPROVED", "EXPORTED"].includes(run.status));
  if (!approvedRun) {
    throw new Error("试运行报告必须绑定已审批通过的 run");
  }

  const issues = store.issues.filter((issue) => issue.trialRunId === trialRunId);
  const snapshot = approvedRun.snapshot;
  const report: TrialRunReportRecord = {
    id: `trial-run-report-${store.reports.length + 1}`,
    trialRunId,
    trialRunName: trialRun.name,
    periodCode: trialRun.periodCode,
    departmentName: acceptanceDepartmentName,
    gitCommit: input.gitCommit,
    dataSources: ["导入数据", "手工录入", "种子数据"],
    importBatchIds: store.importContext.batches.map((batch) => batch.batchId),
    trialRunRunNos: store.settlementRuns.filter((run) => run.periodCode === trialRun.periodCode).map((run) => run.runNo),
    approvalRunNo: approvedRun.runNo,
    targetAmountCents: snapshot.targetAmountCents,
    confirmedRevenueAmountCents: snapshot.confirmedRevenueAmountCents,
    achievementRateBps: snapshot.achievementRateBps,
    commissionPoolCents: snapshot.departmentCommissionPoolCents,
    currentPayoutTotalCents: sum(snapshot.lines.map((line) => line.currentPayoutCents)),
    futurePayoutTotalCents: sum(snapshot.lines.map((line) => line.futurePayoutCents)),
    adjustmentTotalCents: sum(snapshot.lines.map((line) => line.adjustmentAmountCents)),
    frozenTotalCents: sum(snapshot.lines.map((line) => line.frozenAmountCents)),
    issueCount: issues.length,
    resolvedIssueCount: issues.filter((issue) => issue.status === "RESOLVED").length,
    openIssueCount: issues.filter((issue) => ["OPEN", "FIXING"].includes(issue.status)).length,
    result: trialRun.result,
    acceptedBy: input.acceptedBy,
    acceptedAt: input.acceptedAt,
    markdown: ""
  };
  report.markdown = buildTrialRunReportMarkdown(report, issues, trialRun.summary);
  store.reports.push(report);
  return report;
}

function buildSettlementInputWithAdjustments(store: TrialRunWorkflowStore, periodCode: string): CommissionSettlementInput {
  const input = buildCommissionInputFromImportDraft(store.importContext, periodCode);
  const adjustmentAmountByUserId = store.adjustments
    .filter((adjustment) => adjustment.periodCode === periodCode && ["APPROVED", "APPLIED"].includes(adjustment.status))
    .reduce<Record<string, number>>((acc, adjustment) => {
      const signedAmount = adjustment.direction === "ADD" ? adjustment.amountCents : -adjustment.amountCents;
      acc[adjustment.userId] = (acc[adjustment.userId] ?? 0) + signedAmount;
      return acc;
    }, {});

  return { ...input, adjustmentAmountByUserId };
}

function markApprovedAdjustmentsApplied(store: TrialRunWorkflowStore, periodCode: string, runId: string) {
  for (const adjustment of store.adjustments) {
    if (adjustment.periodCode === periodCode && adjustment.status === "APPROVED") {
      adjustment.status = "APPLIED";
      adjustment.appliedRunId = runId;
      adjustment.updatedAt = new Date().toISOString();
    }
  }
}

function buildNextRunNo(store: TrialRunWorkflowStore, periodCode: string): string {
  const next = store.settlementRuns.filter((run) => run.periodCode === periodCode).length + 1;
  return `${periodCode}-RUN-${String(next).padStart(3, "0")}`;
}

function findRun(store: TrialRunWorkflowStore, runId: string): SettlementRunRecord {
  const run = store.settlementRuns.find((candidate) => candidate.id === runId);
  if (!run) {
    throw new Error(`结算 run 不存在：${runId}`);
  }
  return run;
}

function findPeriod(store: TrialRunWorkflowStore, periodCode: string): ImportContext["periods"][number] {
  const period = store.importContext.periods.find((candidate) => candidate.periodCode === periodCode);
  if (!period) {
    throw new Error(`考核周期不存在：${periodCode}`);
  }
  return period;
}

function findAdjustment(store: TrialRunWorkflowStore, adjustmentId: string): CommissionAdjustmentRecord {
  const adjustment = store.adjustments.find((candidate) => candidate.id === adjustmentId);
  if (!adjustment) {
    throw new Error(`人工调整不存在：${adjustmentId}`);
  }
  return adjustment;
}

function findTrialRun(store: TrialRunWorkflowStore, trialRunId: string): TrialRunRecord {
  const trialRun = store.trialRuns.find((candidate) => candidate.id === trialRunId);
  if (!trialRun) {
    throw new Error(`试运行不存在：${trialRunId}`);
  }
  return trialRun;
}

function findIssue(store: TrialRunWorkflowStore, issueId: string): TrialRunIssueRecord {
  const issue = store.issues.find((candidate) => candidate.id === issueId);
  if (!issue) {
    throw new Error(`试运行问题不存在：${issueId}`);
  }
  return issue;
}

function diffAmount(before: number, after: number): DiffAmount {
  return { before, after, deltaCents: after - before };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function buildTrialRunReportMarkdown(
  report: TrialRunReportRecord,
  issues: TrialRunIssueRecord[],
  summary: string
): string {
  const issueLines = issues.map((issue) => `- [${issue.status}] ${issue.severity} ${issue.category}: ${issue.title}`);
  return [
    `# ${report.trialRunName}`,
    "",
    `- 考核周期：${report.periodCode}`,
    `- 部门：${report.departmentName}`,
    `- Git commit：${report.gitCommit}`,
    `- 试算 runNo：${report.trialRunRunNos.join(", ")}`,
    `- 审批 runNo：${report.approvalRunNo}`,
    `- 验收结论：${report.result}`,
    `- 验收人：${report.acceptedBy}`,
    `- 验收时间：${report.acceptedAt}`,
    "",
    "## 试运行摘要",
    summary,
    "",
    "## 发现问题列表",
    issueLines.length > 0 ? issueLines.join("\n") : "无",
    ""
  ].join("\n");
}
