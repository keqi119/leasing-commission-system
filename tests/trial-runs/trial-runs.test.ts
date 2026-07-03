import { describe, expect, test } from "vitest";
import {
  approveSettlementRun,
  completeTrialRun,
  createTrialRun,
  createTrialRunIssue,
  createTrialRunWorkflowStore,
  generateTrialRunReport,
  recalculateSettlementRun,
  resolveTrialRunIssue,
  submitSettlementRun
} from "../../apps/web/src/server/trial-run-workflow";

describe("LCS-P1-H04 trial run issue tracking and reporting", () => {
  test("tracks issues through resolution and generates a report bound to the approved run", () => {
    const store = createTrialRunWorkflowStore();
    const trialRun = createTrialRun(store, {
      periodCode: "2026-04",
      name: "2026-04 真实账期首轮试运行",
      startedBy: "hr-1"
    });

    const issue = createTrialRunIssue(store, {
      trialRunId: trialRun.id,
      severity: "MAJOR",
      category: "REVENUE",
      title: "财务补审收入后需重算",
      description: "销售 B 有一笔 12,000 元租金收入需补审。",
      ownerRole: "FINANCE",
      createdBy: "hr-1"
    });

    resolveTrialRunIssue(store, issue.id, {
      resolvedBy: "finance-1",
      resolution: "已补审收入并由 HR 重新试算"
    });

    const run = recalculateSettlementRun(store, { periodCode: "2026-04", calculatedBy: "hr-1" });
    submitSettlementRun(store, run.id, { submittedBy: "hr-1" });
    approveSettlementRun(store, run.id, {
      approvedBy: "boss-1",
      approvedAt: "2026-05-06T09:00:00.000Z"
    });
    completeTrialRun(store, trialRun.id, {
      completedBy: "hr-1",
      result: "PASS_WITH_LIMITATIONS",
      summary: "真实账期试运行完成，遗留风险已记录。"
    });

    const report = generateTrialRunReport(store, trialRun.id, {
      gitCommit: "test-commit",
      acceptedBy: "老板",
      acceptedAt: "2026-05-06T10:00:00.000Z"
    });

    expect(store.issues[0]).toMatchObject({ status: "RESOLVED", resolvedBy: "finance-1" });
    expect(report.approvalRunNo).toBe("2026-04-RUN-001");
    expect(report.gitCommit).toBe("test-commit");
    expect(report.resolvedIssueCount).toBe(1);
    expect(report.markdown).toContain("2026-04-RUN-001");
    expect(report.markdown).toContain("PASS_WITH_LIMITATIONS");
  });
});
