import Link from "next/link";
import { notFound } from "next/navigation";
import {
  adjustmentDirectionLabel,
  adjustmentTypeLabel,
  issueSeverityLabel,
  issueStatusLabel,
  roleLabel,
  statusLabel,
  trialRunResultLabel,
  yesNo
} from "@/server/display-labels";
import { buildExportGuidance, buildSettlementSubmissionGuidance, summarizeIssueState } from "@/server/db-workflow-status";
import { formatBps, formatCny } from "@/server/sample";
import { getTrialRun } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TrialRunDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getTrialRun(id);
  if (!detail) {
    notFound();
  }
  const latestRun = [...detail.settlementRuns].reverse()[0];
  const approvedRun = [...detail.settlementRuns].reverse().find((run) => ["APPROVED", "EXPORTED"].includes(run.status));
  const issueState = summarizeIssueState(detail.issues);
  const pendingAdjustmentCount = detail.adjustments.filter((adjustment) => ["DRAFT", "SUBMITTED"].includes(adjustment.status)).length;
  const blockerCount = issueState.blockerCount;
  const submissionGuidance = buildSettlementSubmissionGuidance({
    runNo: latestRun?.runNo,
    status: latestRun?.status,
    blockerCount,
    pendingAdjustmentCount
  });
  const exportGuidance = buildExportGuidance({ runNo: approvedRun?.runNo ?? latestRun?.runNo, status: approvedRun?.status ?? latestRun?.status });
  const report = detail.reports[0];

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">{detail.trialRun.name}</h1>
          <p className="page-subtitle">
            账期 {detail.trialRun.periodCode} / {detail.departmentName} / {detail.periodStatus}
          </p>
        </div>
        <span className={blockerCount > 0 ? "badge red" : "badge green"}>
          {blockerCount > 0 ? `${blockerCount} 个阻塞问题` : "可继续推进"}
        </span>
      </header>

      <section className="metric-grid">
        <div className="metric">
          <span>当前结算批次</span>
          <strong>{latestRun?.runNo ?? "-"}</strong>
        </div>
        <div className="metric">
          <span>已审批批次</span>
          <strong>{approvedRun?.runNo ?? "-"}</strong>
        </div>
        <div className="metric">
          <span>部门实收</span>
          <strong>{approvedRun ? formatCny(approvedRun.snapshot.confirmedRevenueAmountCents) : "-"}</strong>
        </div>
        <div className="metric">
          <span>达成率</span>
          <strong>{approvedRun ? formatBps(approvedRun.snapshot.achievementRateBps) : "-"}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>当前状态与下一步</h2>
          <span className={`badge ${submissionGuidance.canSubmit || exportGuidance.canExport ? "green" : "amber"}`}>
            {exportGuidance.canExport ? "可导出" : submissionGuidance.canSubmit ? "可提交审批" : "需要处理"}
          </span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>当前账期</th><td>{detail.trialRun.periodCode} / {detail.periodStatus}</td></tr>
              <tr><th>当前试运行</th><td>{detail.trialRun.name} / {statusLabel(detail.trialRun.status, "trialRun")}</td></tr>
              <tr><th>当前结算批次</th><td>{latestRun?.runNo ?? "-"}</td></tr>
              <tr><th>阻塞 / 重大问题</th><td>{issueState.blockerCount} / {issueState.majorCount}</td></tr>
              <tr><th>待审批人工调整</th><td>{pendingAdjustmentCount}</td></tr>
              <tr><th>是否可提交审批</th><td>{yesNo(submissionGuidance.canSubmit)}</td></tr>
              <tr><th>是否可导出</th><td>{yesNo(exportGuidance.canExport)}</td></tr>
              <tr><th>下一步角色</th><td>{exportGuidance.canExport ? exportGuidance.nextRole : submissionGuidance.nextRole}</td></tr>
              <tr><th>下一步操作</th><td>{exportGuidance.canExport ? exportGuidance.message : submissionGuidance.message}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-head">
            <h2>结算批次版本</h2>
            <span className="badge blue">不覆盖历史</span>
          </div>
          <div className="panel-body">
            {detail.settlementRuns.length === 0 ? (
              <p className="empty-state">该账期还没有生成结算批次。</p>
            ) : (
              <table className="data-table">
                <tbody>
                  {detail.settlementRuns.map((run) => (
                    <tr key={run.id}>
                      <th>{run.runNo}</th>
                      <td>{statusLabel(run.status)}</td>
                      <td>{run.rejectionReason ?? "已保留"}</td>
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
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>问题列表</h2>
            <span className="badge amber">{detail.issues.length}</span>
          </div>
          <div className="panel-body">
            {detail.issues.length === 0 ? (
              <p className="empty-state">暂无试运行问题记录。</p>
            ) : (
              <table className="data-table">
                <tbody>
                  {detail.issues.map((issue) => (
                    <tr key={issue.id}>
                      <th>{issue.title}</th>
                      <td>{issueSeverityLabel(issue.severity)}</td>
                      <td>{roleLabel(issue.ownerRole)}</td>
                      <td>{issueStatusLabel(issue.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>人工调整</h2>
          <span className={pendingAdjustmentCount > 0 ? "badge amber" : "badge green"}>
            {pendingAdjustmentCount > 0 ? `${pendingAdjustmentCount} 条待处理` : "无待处理"}
          </span>
        </div>
        <div className="panel-body">
          {detail.adjustments.length === 0 ? (
            <p className="empty-state">该账期暂无人工调整记录。</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>调整对象</th>
                  <th>调整类型</th>
                  <th>方向</th>
                  <th>调整金额</th>
                  <th>状态</th>
                  <th>进入批次</th>
                  <th>原因</th>
                </tr>
              </thead>
              <tbody>
                {detail.adjustments.map((adjustment) => (
                  <tr key={adjustment.id}>
                    <td>{adjustment.userId}</td>
                    <td>{adjustmentTypeLabel(adjustment.adjustmentType)}</td>
                    <td>{adjustmentDirectionLabel(adjustment.direction)}</td>
                    <td>{formatCny(adjustment.amountCents)}</td>
                    <td>{statusLabel(adjustment.status, "adjustment")}</td>
                    <td>{adjustment.appliedRunId ?? "-"}</td>
                    <td>{adjustment.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>报告与导出</h2>
          <span className="badge green">{approvedRun ? "已绑定审批批次" : "等待审批"}</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr>
                <th>试运行报告</th>
                <td>{report ? `${trialRunResultLabel(report.result)} / ${report.approvalRunNo}` : "未生成"}</td>
              </tr>
              <tr>
                <th>导出记录</th>
                <td>{detail.exports.map((record) => `${record.fileName} -> ${record.runNo}`).join(", ") || "暂无"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
