const settlementStatusLabels: Record<string, string> = {
  DRAFT: "草稿",
  CALCULATED: "已试算",
  SUBMITTED: "待老板审批",
  APPROVED: "老板已审批",
  REJECTED: "已驳回",
  EXPORTED: "已导出",
  CLOSED: "已关闭"
};

const trialRunStatusLabels: Record<string, string> = {
  DRAFT: "草稿",
  RUNNING: "试运行中",
  COMPLETED: "已完成",
  CLOSED: "已关闭"
};

const trialRunResultLabels: Record<string, string> = {
  PASS: "通过",
  PASS_WITH_LIMITATIONS: "有保留通过",
  FAIL: "不通过"
};

const adjustmentStatusLabels: Record<string, string> = {
  DRAFT: "草稿",
  SUBMITTED: "待老板审批",
  APPROVED: "已审批",
  REJECTED: "已驳回",
  APPLIED: "已进入结算批次"
};

const adjustmentDirectionLabels: Record<string, string> = {
  ADD: "增加",
  DEDUCT: "扣减"
};

const adjustmentTypeLabels: Record<string, string> = {
  DATA_CORRECTION: "数据修正",
  BOSS_DECISION: "老板决策",
  RECEIVABLE_FREEZE: "应收冻结",
  DEPOSIT_RISK: "押金风险",
  SPECIAL_REWARD: "特殊奖励",
  SPECIAL_DEDUCTION: "特殊扣减",
  ROUNDING_CORRECTION: "尾差修正",
  OTHER: "其他"
};

const issueSeverityLabels: Record<string, string> = {
  BLOCKER: "阻塞",
  MAJOR: "重大",
  MINOR: "一般",
  INFO: "提示"
};

const issueCategoryLabels: Record<string, string> = {
  IMPORT: "导入",
  ORDER: "订单",
  REVENUE: "租金收入",
  DEPOSIT: "押金",
  EXTERNAL_PROFIT: "外调利润",
  RECEIVABLE: "应收账款",
  TARGET: "收入指标",
  SETTLEMENT: "提成试算",
  EXPORT: "奖金导出",
  PERMISSION: "权限"
};

const issueStatusLabels: Record<string, string> = {
  OPEN: "待处理",
  FIXING: "处理中",
  RESOLVED: "已解决",
  ACCEPTED_RISK: "接受风险"
};

const roleLabels: Record<string, string> = {
  BOSS: "老板",
  SALES: "销售",
  SALES_MANAGER: "销售经理",
  FINANCE: "财务",
  ASSET_MANAGER: "资管",
  HR: "HR",
  ADMIN: "管理员"
};

export function statusLabel(status: string | null | undefined, kind: "settlement" | "trialRun" | "adjustment" = "settlement") {
  if (!status) {
    return "-";
  }
  const labels = kind === "trialRun" ? trialRunStatusLabels : kind === "adjustment" ? adjustmentStatusLabels : settlementStatusLabels;
  return labels[status] ?? status;
}

export function trialRunResultLabel(result: string | null | undefined) {
  return result ? trialRunResultLabels[result] ?? result : "-";
}

export function adjustmentDirectionLabel(direction: string | null | undefined) {
  return direction ? adjustmentDirectionLabels[direction] ?? direction : "-";
}

export function adjustmentTypeLabel(type: string | null | undefined) {
  return type ? adjustmentTypeLabels[type] ?? type : "-";
}

export function issueSeverityLabel(severity: string | null | undefined) {
  return severity ? issueSeverityLabels[severity] ?? severity : "-";
}

export function issueCategoryLabel(category: string | null | undefined) {
  return category ? issueCategoryLabels[category] ?? category : "-";
}

export function issueStatusLabel(status: string | null | undefined) {
  return status ? issueStatusLabels[status] ?? status : "-";
}

export function roleLabel(role: string | null | undefined) {
  return role ? roleLabels[role] ?? role : "-";
}

export function yesNo(value: boolean) {
  return value ? "是" : "否";
}
