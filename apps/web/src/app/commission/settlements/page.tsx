import Link from "next/link";
import { statusLabel, yesNo } from "@/server/display-labels";
import { formatBps, formatCny } from "@/server/sample";
import { buildTrialRunCheckReportFromDb, listAdjustments, listSettlementRuns } from "@/server/trial-run-db-workflow";
import { buildExportGuidance, buildSettlementSubmissionGuidance } from "@/server/db-workflow-status";

export const dynamic = "force-dynamic";

export default async function SettlementsPage() {
  const [runs, adjustments, checkReport] = await Promise.all([listSettlementRuns(), listAdjustments(), buildTrialRunCheckReportFromDb()]);
  const latestRun = runs[0];
  const pendingAdjustmentCount = adjustments.filter((adjustment) => ["DRAFT", "SUBMITTED"].includes(adjustment.status)).length;
  const blockerCount = checkReport?.issueSuggestions.filter((issue) => issue.severity === "BLOCKER").length ?? 0;
  const submissionGuidance = buildSettlementSubmissionGuidance({
    runNo: latestRun?.runNo,
    status: latestRun?.status,
    blockerCount,
    pendingAdjustmentCount
  });
  const exportGuidance = buildExportGuidance({ runNo: latestRun?.runNo, status: latestRun?.status });

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">HR 提成试算</h1>
          <p className="page-subtitle">
            每次重算都会生成新的结算批次号，已驳回和已审批的历史批次会保留。
          </p>
        </div>
        <span className={pendingAdjustmentCount > 0 ? "badge amber" : "badge green"}>
          {pendingAdjustmentCount > 0 ? `${pendingAdjustmentCount} 条调整待处理` : "可进入审批"}
        </span>
      </header>

      <section className="metric-grid">
        <div className="metric">
          <span>最新结算批次</span>
          <strong>{latestRun?.runNo ?? "-"}</strong>
        </div>
        <div className="metric">
          <span>部门目标</span>
          <strong>{latestRun ? formatCny(latestRun.snapshot.targetAmountCents) : "-"}</strong>
        </div>
        <div className="metric">
          <span>部门实收</span>
          <strong>{latestRun ? formatCny(latestRun.snapshot.confirmedRevenueAmountCents) : "-"}</strong>
        </div>
        <div className="metric">
          <span>达成率</span>
          <strong>{latestRun ? formatBps(latestRun.snapshot.achievementRateBps) : "-"}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>当前状态与下一步</h2>
          <span className={`badge ${submissionGuidance.canSubmit || exportGuidance.canExport ? "green" : "amber"}`}>
            {exportGuidance.canExport ? "可导出" : submissionGuidance.canSubmit ? "可提交审批" : "需先处理问题"}
          </span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>当前账期</th><td>{latestRun?.periodCode ?? checkReport?.periodCode ?? "-"}</td></tr>
              <tr><th>当前试运行</th><td>查看试运行闭环页面的问题清单和报告</td></tr>
              <tr><th>当前结算批次</th><td>{latestRun?.runNo ?? "-"}</td></tr>
              <tr><th>当前状态</th><td>{latestRun ? statusLabel(latestRun.status) : "暂无结算批次"}</td></tr>
              <tr><th>阻塞 / 重大问题建议</th><td>{blockerCount} / {checkReport?.issueSuggestions.filter((issue) => issue.severity === "MAJOR").length ?? 0}</td></tr>
              <tr><th>待处理人工调整</th><td>{pendingAdjustmentCount}</td></tr>
              <tr><th>是否可提交审批</th><td>{yesNo(submissionGuidance.canSubmit)}</td></tr>
              <tr><th>是否可导出</th><td>{yesNo(exportGuidance.canExport)}</td></tr>
              <tr><th>下一步角色</th><td>{exportGuidance.canExport ? exportGuidance.nextRole : submissionGuidance.nextRole}</td></tr>
              <tr><th>下一步操作</th><td>{exportGuidance.canExport ? exportGuidance.message : submissionGuidance.message}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>结算批次版本</h2>
          <span className="badge blue">计算快照</span>
        </div>
        <div className="panel-body">
          {runs.length === 0 ? (
            <p className="empty-state">暂无结算批次。请先导入或录入数据，再由 HR 发起试算。</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>结算批次号</th>
                  <th>考核周期</th>
                  <th>状态</th>
                  <th>部门实收</th>
                  <th>适用提成比例</th>
                  <th>部门提成池</th>
                  <th>驳回原因</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>{run.runNo}</td>
                    <td>{run.periodCode}</td>
                    <td>{statusLabel(run.status)}</td>
                    <td>{formatCny(run.snapshot.confirmedRevenueAmountCents)}</td>
                    <td>{formatBps(run.snapshot.appliedCommissionRateBps)}</td>
                    <td>{formatCny(run.snapshot.departmentCommissionPoolCents)}</td>
                    <td>{run.rejectionReason ?? "-"}</td>
                    <td>
                      <Link className="button-link secondary" href={`/commission/settlements/${run.id}/diff`}>
                        查看差异
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>个人提成明细</h2>
          <span className="badge green">计算引擎</span>
        </div>
        <div className="panel-body">
          {!latestRun ? (
            <p className="empty-state">暂无个人明细可展示。</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>员工</th>
                  <th>个人贡献收入</th>
                  <th>个人贡献率</th>
                  <th>个人提成总额</th>
                  <th>本期应发</th>
                  <th>后续待发</th>
                  <th>调整金额</th>
                </tr>
              </thead>
              <tbody>
                {latestRun.snapshot.lines.map((line) => (
                  <tr key={line.userId}>
                    <td>{line.employeeName}</td>
                    <td>{formatCny(line.confirmedContributionAmountCents)}</td>
                    <td>{formatBps(line.contributionRateBps)}</td>
                    <td>{formatCny(line.grossCommissionCents)}</td>
                    <td>{formatCny(line.finalCurrentPayableCents)}</td>
                    <td>{formatCny(line.futurePayoutCents)}</td>
                    <td>{formatCny(line.adjustmentAmountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
