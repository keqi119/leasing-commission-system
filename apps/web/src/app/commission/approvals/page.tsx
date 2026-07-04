import Link from "next/link";
import { SettlementActionPanel } from "@/components/SettlementActionPanel";
import { statusLabel, yesNo } from "@/server/display-labels";
import { buildExportGuidance } from "@/server/db-workflow-status";
import { listSettlementRuns } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const runs = await listSettlementRuns();
  const pendingRuns = runs.filter((run) => run.status === "SUBMITTED");
  const latestApproved = runs.find((run) => ["APPROVED", "EXPORTED"].includes(run.status));
  const currentRun = pendingRuns[0] ?? runs[0];
  const exportGuidance = buildExportGuidance({ runNo: latestApproved?.runNo ?? currentRun?.runNo, status: latestApproved?.status ?? currentRun?.status });

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">老板审批</h1>
          <p className="page-subtitle">
            老板可以审批或驳回已提交的结算批次；驳回必须填写原因，HR 修正数据后重新试算生成新批次。
          </p>
        </div>
        <span className={pendingRuns.length > 0 ? "badge amber" : "badge green"}>
          {pendingRuns.length > 0 ? `${pendingRuns.length} 个待审批` : `正式批次 ${latestApproved?.runNo ?? "-"}`}
        </span>
      </header>

      <SettlementActionPanel
        mode="approvals"
        latestRunId={currentRun?.id}
        latestRunNo={currentRun?.runNo}
        latestRunStatus={currentRun?.status}
        defaultPeriodCode={currentRun?.periodCode ?? "2026-04"}
      />

      <section className="panel">
        <div className="panel-head">
          <h2>当前状态与下一步</h2>
          <span className={pendingRuns.length > 0 ? "badge amber" : exportGuidance.canExport ? "badge green" : "badge blue"}>
            {pendingRuns.length > 0 ? "老板待审" : exportGuidance.canExport ? "已审批" : "等待提交"}
          </span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>当前账期</th><td>{currentRun?.periodCode ?? "-"}</td></tr>
              <tr><th>当前试运行</th><td>请从试运行闭环页面查看关联问题和试运行报告</td></tr>
              <tr><th>当前结算批次</th><td>{currentRun?.runNo ?? "-"}</td></tr>
              <tr><th>当前状态</th><td>{currentRun ? statusLabel(currentRun.status) : "暂无结算批次"}</td></tr>
              <tr><th>是否可提交审批</th><td>{pendingRuns.length > 0 ? "已提交老板审批" : "由 HR 在提成试算流程提交"}</td></tr>
              <tr><th>是否可导出</th><td>{yesNo(exportGuidance.canExport)}</td></tr>
              <tr><th>下一步角色</th><td>{pendingRuns.length > 0 ? "老板" : exportGuidance.nextRole}</td></tr>
              <tr>
                <th>下一步操作</th>
                <td>
                  {pendingRuns.length > 0
                    ? `老板审批或驳回结算批次 ${pendingRuns[0].runNo}；驳回必须填写原因。`
                    : exportGuidance.message}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>审批队列</h2>
          <span className="badge blue">数据库流程</span>
        </div>
        <div className="panel-body">
          {runs.length === 0 ? (
            <p className="empty-state">暂无等待审批的结算批次。</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>结算批次号</th>
                  <th>考核周期</th>
                  <th>状态</th>
                  <th>提交人</th>
                  <th>审批 / 驳回人</th>
                  <th>驳回原因 / 操作</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>{run.runNo}</td>
                    <td>{run.periodCode}</td>
                    <td>{statusLabel(run.status)}</td>
                    <td>{run.submittedBy ?? "-"}</td>
                    <td>{run.approvedBy ?? run.rejectedBy ?? "-"}</td>
                    <td>
                      {run.rejectionReason ? (
                        run.rejectionReason
                      ) : (
                        <Link className="button-link secondary" href={`/commission/settlements/${run.id}/diff`}>
                          查看差异
                        </Link>
                      )}
                    </td>
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
