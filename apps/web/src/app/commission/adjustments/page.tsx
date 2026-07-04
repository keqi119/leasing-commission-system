import { adjustmentDirectionLabel, adjustmentTypeLabel, statusLabel } from "@/server/display-labels";
import { formatCny } from "@/server/sample";
import { listAdjustments, listSettlementRuns } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

export default async function AdjustmentsPage() {
  const [adjustments, runs] = await Promise.all([listAdjustments(), listSettlementRuns()]);
  const runNoById = new Map(runs.map((run) => [run.id, run.runNo]));
  const pendingAdjustmentCount = adjustments.filter((adjustment) => ["DRAFT", "SUBMITTED"].includes(adjustment.status)).length;
  const appliedAdjustmentCount = adjustments.filter((adjustment) => adjustment.status === "APPLIED").length;

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">人工调整</h1>
          <p className="page-subtitle">
            人工调整必须可追溯，不修改原始收入台账；只有老板审批后，才会进入新的结算批次。
          </p>
        </div>
        <span className={pendingAdjustmentCount > 0 ? "badge amber" : "badge blue"}>
          {pendingAdjustmentCount > 0 ? `${pendingAdjustmentCount} 条待处理` : `${adjustments.length} 条记录`}
        </span>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>当前状态与下一步</h2>
          <span className={pendingAdjustmentCount > 0 ? "badge amber" : "badge green"}>
            {pendingAdjustmentCount > 0 ? "需要审批" : "可进入试算"}
          </span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>当前账期</th><td>{adjustments[0]?.periodCode ?? "-"}</td></tr>
              <tr><th>当前试运行</th><td>请在试运行详情页查看关联账期的问题和报告</td></tr>
              <tr><th>当前结算批次</th><td>{runs[0]?.runNo ?? "-"}</td></tr>
              <tr><th>待审批人工调整</th><td>{pendingAdjustmentCount}</td></tr>
              <tr><th>已进入结算批次</th><td>{appliedAdjustmentCount}</td></tr>
              <tr><th>是否可提交审批</th><td>{pendingAdjustmentCount > 0 ? "否，除非 HR 明确选择本次不纳入" : "是，完成试算后可提交"}</td></tr>
              <tr><th>是否可导出</th><td>仅老板审批通过的结算批次可以导出</td></tr>
              <tr>
                <th>下一步操作</th>
                <td>
                  {pendingAdjustmentCount > 0
                    ? `不能提交审批：还有 ${pendingAdjustmentCount} 条人工调整未审批。`
                    : "审批后的人工调整只能进入新结算批次；已进入批次的调整不能直接修改。"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>调整记录</h2>
          <span className="badge green">需要审批</span>
        </div>
        <div className="panel-body">
          {adjustments.length === 0 ? (
            <p className="empty-state">暂无人工调整记录。</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>考核周期</th>
                  <th>调整对象</th>
                  <th>调整类型</th>
                  <th>方向</th>
                  <th>调整金额</th>
                  <th>状态</th>
                  <th>进入批次</th>
                  <th>申请人</th>
                  <th>审批人</th>
                  <th>证据链接</th>
                  <th>原因</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adjustment) => (
                  <tr key={adjustment.id}>
                    <td>{adjustment.periodCode}</td>
                    <td>{adjustment.userId}</td>
                    <td>{adjustmentTypeLabel(adjustment.adjustmentType)}</td>
                    <td>{adjustmentDirectionLabel(adjustment.direction)}</td>
                    <td>{formatCny(adjustment.amountCents)}</td>
                    <td>{statusLabel(adjustment.status, "adjustment")}</td>
                    <td>{adjustment.appliedRunId ? runNoById.get(adjustment.appliedRunId) ?? adjustment.appliedRunId : "-"}</td>
                    <td>{adjustment.requestedBy}</td>
                    <td>{adjustment.approvedBy ?? "-"}</td>
                    <td>{adjustment.evidenceUrl ?? "-"}</td>
                    <td>{adjustment.reason}</td>
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
