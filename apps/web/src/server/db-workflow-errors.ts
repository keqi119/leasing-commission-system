export type WorkflowErrorCode =
  | "ADJUSTMENT_REASON_REQUIRED"
  | "ADJUSTMENT_AMOUNT_INVALID"
  | "ADJUSTMENT_NOT_DRAFT"
  | "ADJUSTMENT_NOT_SUBMITTED"
  | "ADJUSTMENT_NOT_REJECTABLE"
  | "SETTLEMENT_RUN_NOT_FOUND"
  | "SETTLEMENT_RUN_NOT_SUBMITTABLE"
  | "OPEN_BLOCKER_ISSUES"
  | "PENDING_MANUAL_ADJUSTMENTS"
  | "REJECTION_REASON_REQUIRED"
  | "SETTLEMENT_RUN_NOT_REJECTABLE"
  | "SETTLEMENT_RUN_NOT_APPROVABLE"
  | "SETTLEMENT_RUN_NOT_EXPORTABLE"
  | "PERIOD_REOPEN_REASON_REQUIRED"
  | "PERIOD_REOPEN_NOT_PENDING"
  | "TRIAL_RUN_NOT_FOUND"
  | "TRIAL_RUN_REPORT_APPROVED_RUN_REQUIRED"
  | "RECORD_NOT_FOUND";

export type WorkflowErrorContext = Record<string, string | number | boolean | null | undefined>;

export class DbWorkflowError extends Error {
  readonly code: WorkflowErrorCode;
  readonly context: WorkflowErrorContext;
  readonly status: number;

  constructor(code: WorkflowErrorCode, context: WorkflowErrorContext = {}, status?: number) {
    super(code);
    this.name = "DbWorkflowError";
    this.code = code;
    this.context = context;
    this.status = status ?? defaultStatusByCode[code] ?? 400;
  }
}

const defaultStatusByCode: Record<WorkflowErrorCode, number> = {
  ADJUSTMENT_REASON_REQUIRED: 400,
  ADJUSTMENT_AMOUNT_INVALID: 400,
  ADJUSTMENT_NOT_DRAFT: 409,
  ADJUSTMENT_NOT_SUBMITTED: 409,
  ADJUSTMENT_NOT_REJECTABLE: 409,
  SETTLEMENT_RUN_NOT_FOUND: 404,
  SETTLEMENT_RUN_NOT_SUBMITTABLE: 409,
  OPEN_BLOCKER_ISSUES: 409,
  PENDING_MANUAL_ADJUSTMENTS: 409,
  REJECTION_REASON_REQUIRED: 400,
  SETTLEMENT_RUN_NOT_REJECTABLE: 409,
  SETTLEMENT_RUN_NOT_APPROVABLE: 409,
  SETTLEMENT_RUN_NOT_EXPORTABLE: 409,
  PERIOD_REOPEN_REASON_REQUIRED: 400,
  PERIOD_REOPEN_NOT_PENDING: 409,
  TRIAL_RUN_NOT_FOUND: 404,
  TRIAL_RUN_REPORT_APPROVED_RUN_REQUIRED: 409,
  RECORD_NOT_FOUND: 404
};

export interface WorkflowErrorPayload {
  code: WorkflowErrorCode;
  error: string;
  status: number;
}

export function getWorkflowErrorMessage(error: unknown): string {
  if (error instanceof DbWorkflowError) {
    return workflowMessages[error.code](error.context);
  }
  return error instanceof Error ? error.message : "业务流程处理失败，请检查输入后重试。";
}

export function toWorkflowErrorPayload(error: unknown): WorkflowErrorPayload {
  if (error instanceof DbWorkflowError) {
    return {
      code: error.code,
      error: getWorkflowErrorMessage(error),
      status: error.status
    };
  }
  return {
    code: "RECORD_NOT_FOUND",
    error: getWorkflowErrorMessage(error),
    status: 500
  };
}

export function isDbWorkflowError(error: unknown): error is DbWorkflowError {
  return error instanceof DbWorkflowError;
}

function countText(value: unknown, fallback = 1): number {
  const count = Number(value ?? fallback);
  return Number.isFinite(count) && count > 0 ? count : fallback;
}

const workflowMessages: Record<WorkflowErrorCode, (context: WorkflowErrorContext) => string> = {
  ADJUSTMENT_REASON_REQUIRED: () => "不能创建人工调整：必须填写调整原因。",
  ADJUSTMENT_AMOUNT_INVALID: () => "不能创建人工调整：调整金额必须大于 0。",
  ADJUSTMENT_NOT_DRAFT: () => "不能提交该调整：只有草稿状态的人工调整可以提交审批。",
  ADJUSTMENT_NOT_SUBMITTED: () => "不能审批该调整：只有已提交的人工调整可以审批。",
  ADJUSTMENT_NOT_REJECTABLE: () => "不能驳回该调整：该调整已进入结算批次或已关闭。",
  SETTLEMENT_RUN_NOT_FOUND: (context) => `未找到结算批次：${context.runId ?? "未知批次"}。`,
  SETTLEMENT_RUN_NOT_SUBMITTABLE: (context) => `当前不能提交老板审批：结算批次 ${context.runNo ?? "当前批次"} 不是可提交状态。`,
  OPEN_BLOCKER_ISSUES: (context) => `当前不能提交老板审批：存在 ${countText(context.blockerCount)} 个 BLOCKER 问题未关闭。`,
  PENDING_MANUAL_ADJUSTMENTS: (context) => `当前不能提交老板审批：还有 ${countText(context.pendingAdjustmentCount)} 条人工调整未审批，请审批后重算，或明确选择不纳入本次。`,
  REJECTION_REASON_REQUIRED: () => "老板驳回必须填写驳回原因，便于 HR 修正后重算。",
  SETTLEMENT_RUN_NOT_REJECTABLE: (context) => `当前不能驳回：结算批次 ${context.runNo ?? "当前批次"} 不是待老板审批状态。`,
  SETTLEMENT_RUN_NOT_APPROVABLE: (context) => `当前不能审批通过：结算批次 ${context.runNo ?? "当前批次"} 不是待老板审批状态。`,
  SETTLEMENT_RUN_NOT_EXPORTABLE: (context) => `当前不能导出：结算批次 ${context.runNo ?? "当前批次"} 尚未老板审批通过。`,
  PERIOD_REOPEN_REASON_REQUIRED: () => "不能申请重开账期：必须填写重开原因。",
  PERIOD_REOPEN_NOT_PENDING: () => "不能审批该重开申请：只有待审批的重开申请可以审批。",
  TRIAL_RUN_NOT_FOUND: (context) => `未找到试运行记录：${context.trialRunId ?? "未知记录"}。`,
  TRIAL_RUN_REPORT_APPROVED_RUN_REQUIRED: () => "不能生成试运行报告：必须先绑定老板审批通过的结算批次。",
  RECORD_NOT_FOUND: (context) => `未找到记录：${context.id ?? "未知记录"}。`
};
