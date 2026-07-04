import Link from "next/link";
import { statusLabel, trialRunResultLabel, yesNo } from "@/server/display-labels";
import { buildExportGuidance } from "@/server/db-workflow-status";
import { listSettlementRuns, listTrialRuns } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

export default async function TrialRunsPage() {
  const [trialRuns, settlementRuns] = await Promise.all([listTrialRuns(), listSettlementRuns()]);
  const approvedRun = settlementRuns.find((run) => ["APPROVED", "EXPORTED"].includes(run.status));
  const latestTrialRun = trialRuns[0];
  const latestRun = settlementRuns[0];
  const exportGuidance = buildExportGuidance({ runNo: approvedRun?.runNo ?? latestRun?.runNo, status: approvedRun?.status ?? latestRun?.status });
  const openIssueHint = trialRuns.length === 0 ? "真实账期导入并提交后，可以新建试运行。" : "跟踪问题处理、重算、审批、导出和报告留存。";

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">试运行闭环</h1>
          <p className="page-subtitle">{openIssueHint}</p>
        </div>
        <Link className="button-link" href="/commission/trial-runs/new">
          新建试运行
        </Link>
      </header>

      <section className="metric-grid">
        <div className="metric">
          <span>试运行数量</span>
          <strong>{trialRuns.length}</strong>
        </div>
        <div className="metric">
          <span>结算批次数量</span>
          <strong>{settlementRuns.length}</strong>
        </div>
        <div className="metric">
          <span>最新已审批批次</span>
          <strong>{approvedRun?.runNo ?? "-"}</strong>
        </div>
        <div className="metric">
          <span>下一步角色</span>
          <strong>{approvedRun ? "HR 导出" : "HR / 老板"}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>当前状态与下一步</h2>
          <span className={`badge ${exportGuidance.canExport ? "green" : "amber"}`}>
            {exportGuidance.canExport ? "可导出" : "审批闭环中"}
          </span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>当前账期</th><td>{latestTrialRun?.periodCode ?? latestRun?.periodCode ?? "-"}</td></tr>
              <tr><th>当前试运行</th><td>{latestTrialRun?.name ?? "-"}</td></tr>
              <tr><th>当前结算批次</th><td>{latestRun?.runNo ?? "-"}</td></tr>
              <tr><th>当前状态</th><td>{latestTrialRun ? statusLabel(latestTrialRun.status, "trialRun") : latestRun ? statusLabel(latestRun.status) : "暂无试运行"}</td></tr>
              <tr><th>是否可提交审批</th><td>{latestRun && ["CALCULATED", "REJECTED"].includes(latestRun.status) ? "需先确认阻塞问题和待审批调整" : "否"}</td></tr>
              <tr><th>是否可导出</th><td>{yesNo(exportGuidance.canExport)}</td></tr>
              <tr><th>下一步角色</th><td>{exportGuidance.nextRole}</td></tr>
              <tr><th>下一步操作</th><td>{exportGuidance.message}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>已落库试运行</h2>
          <span className="badge blue">数据库</span>
        </div>
        <div className="panel-body">
          {trialRuns.length === 0 ? (
            <p className="empty-state">数据库中还没有试运行记录。</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>试运行名称</th>
                  <th>考核周期</th>
                  <th>状态</th>
                  <th>验收结论</th>
                  <th>发起人</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {trialRuns.map((trialRun) => (
                  <tr key={trialRun.id}>
                    <td>{trialRun.name}</td>
                    <td>{trialRun.periodCode}</td>
                    <td>{statusLabel(trialRun.status, "trialRun")}</td>
                    <td>{trialRunResultLabel(trialRun.result)}</td>
                    <td>{trialRun.startedBy}</td>
                    <td>
                      <Link className="button-link secondary" href={`/commission/trial-runs/${trialRun.id}`}>
                        查看
                      </Link>
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
