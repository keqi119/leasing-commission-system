import { statusLabel, yesNo } from "@/server/display-labels";
import { buildExportGuidance } from "@/server/db-workflow-status";
import { listExportBindings, listSettlementRuns } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

export default async function ExportsPage() {
  const [exports, runs] = await Promise.all([listExportBindings(), listSettlementRuns()]);
  const exportableRuns = runs.filter((run) => ["APPROVED", "EXPORTED"].includes(run.status));
  const latestRun = runs[0];
  const latestApprovedRun = exportableRuns[0];
  const exportGuidance = buildExportGuidance({
    runNo: latestApprovedRun?.runNo ?? latestRun?.runNo,
    status: latestApprovedRun?.status ?? latestRun?.status
  });
  const blockedRuns = runs.filter((run) => !["APPROVED", "EXPORTED"].includes(run.status));

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">奖金发放导出记录</h1>
          <p className="page-subtitle">
            正式发放表只能基于老板审批通过的结算批次生成，并永久保留 runId / runNo 绑定关系。
          </p>
        </div>
        <span className="badge green">{exportableRuns.length} 个已审批批次</span>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>当前状态与下一步</h2>
          <span className={`badge ${exportGuidance.canExport ? "green" : "amber"}`}>
            {exportGuidance.canExport ? "可以导出" : "暂不能导出"}
          </span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>当前账期</th><td>{latestApprovedRun?.periodCode ?? latestRun?.periodCode ?? "-"}</td></tr>
              <tr><th>当前试运行</th><td>试运行报告必须引用最终审批通过的结算批次</td></tr>
              <tr><th>当前结算批次</th><td>{latestApprovedRun?.runNo ?? latestRun?.runNo ?? "-"}</td></tr>
              <tr><th>当前状态</th><td>{latestApprovedRun ? statusLabel(latestApprovedRun.status) : latestRun ? statusLabel(latestRun.status) : "暂无结算批次"}</td></tr>
              <tr><th>是否可提交审批</th><td>{latestRun?.status === "CALCULATED" ? "是，清理阻塞问题和待审批调整后可提交" : "否"}</td></tr>
              <tr><th>是否可导出</th><td>{yesNo(exportGuidance.canExport)}</td></tr>
              <tr><th>下一步角色</th><td>{exportGuidance.nextRole}</td></tr>
              <tr><th>下一步操作</th><td>{exportGuidance.message}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>导出绑定</h2>
          <span className="badge blue">HR</span>
        </div>
        <div className="panel-body">
          {exports.length === 0 ? (
            <p className="empty-state">暂无正式导出记录。请先完成老板审批。</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>文件名</th>
                  <th>绑定结算批次号</th>
                  <th>考核周期</th>
                  <th>导出人</th>
                  <th>导出时间</th>
                </tr>
              </thead>
              <tbody>
                {exports.map((record) => (
                  <tr key={record.id}>
                    <td>{record.fileName}</td>
                    <td>{record.runNo}</td>
                    <td>{record.periodCode}</td>
                    <td>{record.exportedBy}</td>
                    <td>{record.exportedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>可导出批次</h2>
          <span className="badge green">仅已审批</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              {exportableRuns.map((run) => (
                <tr key={run.id}>
                  <th>{run.runNo}</th>
                  <td>{statusLabel(run.status)}</td>
                  <td>{run.approvedBy ?? "-"}</td>
                  <td>{run.approvedAt ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>禁止导出批次</h2>
          <span className="badge amber">{blockedRuns.length} 个不可导出</span>
        </div>
        <div className="panel-body">
          {blockedRuns.length === 0 ? (
            <p className="empty-state">暂无禁止导出的批次。请使用上方已审批批次导出正式发放表。</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>结算批次号</th>
                  <th>状态</th>
                  <th>禁止原因</th>
                </tr>
              </thead>
              <tbody>
                {blockedRuns.map((run) => {
                  const guidance = buildExportGuidance({ runNo: run.runNo, status: run.status });
                  return (
                    <tr key={run.id}>
                      <td>{run.runNo}</td>
                      <td>{statusLabel(run.status)}</td>
                      <td>{guidance.message}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
