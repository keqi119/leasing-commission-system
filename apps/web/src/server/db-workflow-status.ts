import type { SettlementStatus } from "@lcs/commission-engine";

export type IssueSeverity = "BLOCKER" | "MAJOR" | "MINOR" | "INFO";
export type IssueStatus = "OPEN" | "FIXING" | "RESOLVED" | "ACCEPTED_RISK";
export type IssueCategory =
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

export interface IssueStateInput {
  severity: IssueSeverity;
  status: IssueStatus;
}

export interface IssueStateSummary {
  blockerCount: number;
  majorCount: number;
  openIssueCount: number;
  acceptedRiskCount: number;
  canProceed: boolean;
}

export interface TrialRunIssueSuggestion {
  severity: IssueSeverity;
  category: IssueCategory;
  ownerRole: "BOSS" | "SALES" | "SALES_MANAGER" | "FINANCE" | "ASSET_MANAGER" | "HR" | "ADMIN";
  title: string;
  description: string;
}

export interface WorkflowGuidance {
  message: string;
  nextRole: string;
}

export interface SubmissionGuidance extends WorkflowGuidance {
  canSubmit: boolean;
}

export interface ExportGuidance extends WorkflowGuidance {
  canExport: boolean;
}

const openStatuses = new Set<IssueStatus>(["OPEN", "FIXING"]);

export function summarizeIssueState(issues: IssueStateInput[]): IssueStateSummary {
  const blockerCount = issues.filter((issue) => issue.severity === "BLOCKER" && openStatuses.has(issue.status)).length;
  const majorCount = issues.filter((issue) => issue.severity === "MAJOR" && openStatuses.has(issue.status)).length;
  const openIssueCount = issues.filter((issue) => openStatuses.has(issue.status)).length;
  const acceptedRiskCount = issues.filter((issue) => issue.status === "ACCEPTED_RISK").length;
  return {
    blockerCount,
    majorCount,
    openIssueCount,
    acceptedRiskCount,
    canProceed: blockerCount === 0
  };
}

export function buildSettlementSubmissionGuidance(input: {
  runNo?: string;
  status?: SettlementStatus;
  blockerCount: number;
  pendingAdjustmentCount: number;
}): SubmissionGuidance {
  if (!input.runNo) {
    return {
      canSubmit: false,
      nextRole: "HR",
      message: "当前不能提交老板审批：还没有生成结算试算批次。"
    };
  }
  if (input.blockerCount > 0) {
    return {
      canSubmit: false,
      nextRole: "财务 / 资管 / 销售",
      message: `当前不能提交老板审批：存在 ${input.blockerCount} 个 BLOCKER 问题未关闭。`
    };
  }
  if (input.pendingAdjustmentCount > 0) {
    return {
      canSubmit: false,
      nextRole: "老板 / HR",
      message: `当前不能提交老板审批：还有 ${input.pendingAdjustmentCount} 条人工调整未审批。`
    };
  }
  if (!["CALCULATED", "REJECTED"].includes(input.status ?? "DRAFT")) {
    return {
      canSubmit: false,
      nextRole: "HR / 老板",
      message: `当前不能提交老板审批：结算批次 ${input.runNo} 状态为 ${input.status ?? "未知"}。`
    };
  }
  return {
    canSubmit: true,
    nextRole: "HR",
    message: `当前可以提交老板审批：结算批次 ${input.runNo} 已完成试算。`
  };
}

export function buildExportGuidance(input: { runNo?: string; status?: SettlementStatus }): ExportGuidance {
  if (!input.runNo) {
    return {
      canExport: false,
      nextRole: "老板 / HR",
      message: "当前不能导出：还没有老板审批通过的结算批次。"
    };
  }
  if (["APPROVED", "EXPORTED"].includes(input.status ?? "DRAFT")) {
    return {
      canExport: true,
      nextRole: "HR",
      message: `当前可以导出：已审批批次 ${input.runNo}，导出将绑定该批次。`
    };
  }
  return {
    canExport: false,
    nextRole: "HR / 老板",
    message: `当前不能导出：结算批次 ${input.runNo} 尚未老板审批通过。`
  };
}

export function summarizeTrialRunCheckIssues(input: {
  pendingRevenueCount: number;
  abnormalDepositCount: number;
  vehicleStatusEventCount: number;
  approvedTargetAdjustmentCount: number;
  pendingTargetAdjustmentCount: number;
}): TrialRunIssueSuggestion[] {
  const suggestions: TrialRunIssueSuggestion[] = [];
  if (input.pendingRevenueCount > 0) {
    suggestions.push({
      severity: "BLOCKER",
      category: "REVENUE",
      ownerRole: "FINANCE",
      title: `存在 ${input.pendingRevenueCount} 笔未审核租金收入`,
      description: "财务需要完成收入审核，否则 HR 不能提交老板审批。"
    });
  }
  if (input.abnormalDepositCount > 0) {
    suggestions.push({
      severity: "MAJOR",
      category: "DEPOSIT",
      ownerRole: "SALES",
      title: `存在 ${input.abnormalDepositCount} 笔异常押金`,
      description: "押金不参与提成，但异常押金需要销售或 HR 在结算前确认风险。"
    });
  }
  if (input.vehicleStatusEventCount > 0 && input.approvedTargetAdjustmentCount === 0) {
    suggestions.push({
      severity: "MAJOR",
      category: "TARGET",
      ownerRole: "ASSET_MANAGER",
      title:
        input.pendingTargetAdjustmentCount > 0
          ? "车辆状态变化存在未审批指标调整"
          : "车辆状态变化尚未形成已审批指标调整",
      description:
        input.pendingTargetAdjustmentCount > 0
          ? "老板需要审批指标调整申请，审批通过后才会影响收入目标。"
          : "资管需要判断车辆停运、维修、下线是否需要提交指标调整申请。"
    });
  }
  return suggestions;
}
