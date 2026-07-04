import { describe, expect, test } from "vitest";
import { DbWorkflowError, getWorkflowErrorMessage, toWorkflowErrorPayload } from "../../apps/web/src/server/db-workflow-errors";
import {
  buildExportGuidance,
  buildSettlementSubmissionGuidance,
  summarizeIssueState,
  summarizeTrialRunCheckIssues
} from "../../apps/web/src/server/db-workflow-status";

describe("LCS-P1-H06 workflow guidance", () => {
  test("maps DB workflow error codes to business-facing copy", () => {
    const error = new DbWorkflowError("OPEN_BLOCKER_ISSUES", { blockerCount: 1 });

    expect(getWorkflowErrorMessage(error)).toBe("当前不能提交老板审批：存在 1 个 BLOCKER 问题未关闭。");
    expect(toWorkflowErrorPayload(error)).toEqual({
      code: "OPEN_BLOCKER_ISSUES",
      error: "当前不能提交老板审批：存在 1 个 BLOCKER 问题未关闭。",
      status: 409
    });
  });

  test("summarizes blocker and major issues for page status areas", () => {
    const summary = summarizeIssueState([
      { severity: "BLOCKER", status: "OPEN" },
      { severity: "BLOCKER", status: "RESOLVED" },
      { severity: "MAJOR", status: "FIXING" },
      { severity: "MINOR", status: "ACCEPTED_RISK" }
    ]);

    expect(summary).toEqual({
      blockerCount: 1,
      majorCount: 1,
      openIssueCount: 2,
      acceptedRiskCount: 1,
      canProceed: false
    });
  });

  test("builds submission and export guidance from run status and blockers", () => {
    expect(buildSettlementSubmissionGuidance({
      runNo: "2026-05-RUN-002",
      status: "CALCULATED",
      blockerCount: 1,
      pendingAdjustmentCount: 0
    })).toMatchObject({
      canSubmit: false,
      nextRole: "财务 / 资管 / 销售",
      message: "当前不能提交老板审批：存在 1 个 BLOCKER 问题未关闭。"
    });

    expect(buildSettlementSubmissionGuidance({
      runNo: "2026-05-RUN-003",
      status: "CALCULATED",
      blockerCount: 0,
      pendingAdjustmentCount: 0
    })).toMatchObject({
      canSubmit: true,
      nextRole: "HR",
      message: "当前可以提交老板审批：结算批次 2026-05-RUN-003 已完成试算。"
    });

    expect(buildExportGuidance({ runNo: "2026-05-RUN-002", status: "REJECTED" })).toEqual({
      canExport: false,
      message: "当前不能导出：结算批次 2026-05-RUN-002 尚未老板审批通过。",
      nextRole: "HR / 老板"
    });
  });

  test("turns trial-run-checks anomalies into issue suggestions", () => {
    const suggestions = summarizeTrialRunCheckIssues({
      pendingRevenueCount: 2,
      abnormalDepositCount: 1,
      vehicleStatusEventCount: 1,
      approvedTargetAdjustmentCount: 0,
      pendingTargetAdjustmentCount: 0
    });

    expect(suggestions).toEqual([
      expect.objectContaining({
        severity: "BLOCKER",
        category: "REVENUE",
        ownerRole: "FINANCE",
        title: "存在 2 笔未审核租金收入"
      }),
      expect.objectContaining({
        severity: "MAJOR",
        category: "DEPOSIT",
        ownerRole: "SALES",
        title: "存在 1 笔异常押金"
      }),
      expect.objectContaining({
        severity: "MAJOR",
        category: "TARGET",
        ownerRole: "ASSET_MANAGER",
        title: "车辆状态变化尚未形成已审批指标调整"
      })
    ]);
  });
});
