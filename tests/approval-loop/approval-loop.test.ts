import { describe, expect, test } from "vitest";
import { previewImportRows } from "../../apps/web/src/server/imports";
import {
  approvePeriodReopen,
  approveSettlementRun,
  createTrialRunWorkflowStore,
  exportApprovedSettlementRun,
  getSettlementRunDiff,
  recalculateSettlementRun,
  rejectSettlementRun,
  requestPeriodReopen,
  submitSettlementRun
} from "../../apps/web/src/server/trial-run-workflow";

describe("LCS-P1-H04 settlement approval loop", () => {
  test("keeps rejected v1, recalculates v2 with diff, and exports only the approved run", () => {
    const store = createTrialRunWorkflowStore();
    const runV1 = recalculateSettlementRun(store, { periodCode: "2026-04", calculatedBy: "hr-1" });
    submitSettlementRun(store, runV1.id, { submittedBy: "hr-1" });

    const rejected = rejectSettlementRun(store, runV1.id, {
      rejectedBy: "boss-1",
      reason: "财务补审收入后重算",
      rejectedAt: "2026-05-05T10:00:00.000Z"
    });

    expect(rejected.status).toBe("REJECTED");
    expect(() => exportApprovedSettlementRun(store, runV1.id, { exportedBy: "hr-1" })).toThrow(
      "只有老板审批通过的结算 run 可以导出正式发放表"
    );

    store.addApprovedRevenueReceipt({
      id: "rev-fix-202604-b",
      periodCode: "2026-04",
      orderNo: "ACC-202604-B-OWNED",
      salesUserId: "B",
      receiptAmountCents: 1200000,
      receiptDate: "2026-04-21",
      companyAccount: "公司账户",
      financeReviewStatus: "APPROVED",
      revenueKind: "OWNED_RENT",
      isCommissionable: true,
      remark: "财务补审租金收入",
      dataSource: "MANUAL"
    });

    const runV2 = recalculateSettlementRun(store, {
      periodCode: "2026-04",
      calculatedBy: "hr-1",
      basedOnRunId: runV1.id
    });
    const diff = getSettlementRunDiff(runV1, runV2);

    expect(runV2.runNo).toBe("2026-04-RUN-002");
    expect(runV1.status).toBe("REJECTED");
    expect(diff.summary.confirmedRevenueAmountCents.deltaCents).toBe(1200000);
    expect(diff.lines.find((line) => line.userId === "B")?.confirmedContributionAmountCents.deltaCents).toBe(1200000);

    submitSettlementRun(store, runV2.id, { submittedBy: "hr-1" });
    approveSettlementRun(store, runV2.id, {
      approvedBy: "boss-1",
      approvedAt: "2026-05-06T09:00:00.000Z"
    });

    const exportRecord = exportApprovedSettlementRun(store, runV2.id, { exportedBy: "hr-1" });
    expect(exportRecord.settlementRunId).toBe(runV2.id);
    expect(exportRecord.runNo).toBe("2026-04-RUN-002");
    expect(store.exports).toHaveLength(1);
  });

  test("locks approved periods, supports controlled reopen, and keeps old export bindings", () => {
    const store = createTrialRunWorkflowStore();
    const runV1 = recalculateSettlementRun(store, { periodCode: "2026-04", calculatedBy: "hr-1" });
    submitSettlementRun(store, runV1.id, { submittedBy: "hr-1" });
    approveSettlementRun(store, runV1.id, { approvedBy: "boss-1" });
    const exportRecord = exportApprovedSettlementRun(store, runV1.id, { exportedBy: "hr-1" });

    const blockedPreview = previewImportRows(
      "revenue",
      [
        {
          考核周期: "2026-04",
          订单号: "ACC-202604-A-OWNED",
          销售姓名: "销售 A",
          收款金额: "1000",
          收款日期: "2026-04-26",
          公司账户: "公司账户",
          财务审核状态: "已审核",
          收入口径: "本期租金",
          是否参与提成: "是"
        }
      ],
      store.importContext
    );

    expect(blockedPreview.rows[0].errors.map((error) => error.code)).toContain("PERIOD_LOCKED_FOR_IMPORT");

    const reopenRequest = requestPeriodReopen(store, {
      periodCode: "2026-04",
      requestedBy: "boss-1",
      reason: "真实账期试运行发现补录凭证"
    });
    approvePeriodReopen(store, reopenRequest.id, { approvedBy: "admin-1" });

    const runV2 = recalculateSettlementRun(store, { periodCode: "2026-04", calculatedBy: "hr-1" });
    expect(runV2.runNo).toBe("2026-04-RUN-002");
    expect(store.exports[0]).toMatchObject({
      id: exportRecord.id,
      settlementRunId: runV1.id,
      runNo: "2026-04-RUN-001"
    });
  });
});
