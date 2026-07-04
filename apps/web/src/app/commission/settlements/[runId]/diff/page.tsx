import { notFound } from "next/navigation";
import { formatBps, formatCny } from "@/server/sample";
import { getSettlementRunDiffForLatest } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ runId: string }>;
};

function formatDelta(cents: number) {
  const sign = cents > 0 ? "+" : "";
  return `${sign}${formatCny(cents)}`;
}

export default async function SettlementDiffPage({ params }: PageProps) {
  const { runId } = await params;
  const diff = await getSettlementRunDiffForLatest(runId);
  if (!diff) {
    notFound();
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">结算差异说明</h1>
          <p className="page-subtitle">
            对比 {diff.fromRunNo} 与 {diff.toRunNo}。旧批次保留，新批次拥有独立计算快照。
          </p>
        </div>
        <span className="badge blue">{diff.toRunNo}</span>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>当前状态与下一步</h2>
          <span className="badge amber">差异复核</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>上一版结算批次</th><td>{diff.fromRunNo}</td></tr>
              <tr><th>当前结算批次</th><td>{diff.toRunNo}</td></tr>
              <tr><th>可计提收入变化</th><td>{formatDelta(diff.summary.confirmedRevenueAmountCents.deltaCents)}</td></tr>
              <tr><th>部门提成池变化</th><td>{formatDelta(diff.summary.departmentCommissionPoolCents.deltaCents)}</td></tr>
              <tr><th>人工调整变化</th><td>{formatDelta(diff.lines.reduce((total, line) => total + line.adjustmentAmountCents.deltaCents, 0))}</td></tr>
              <tr><th>是否可导出</th><td>否，必须等当前批次老板审批通过后才能导出。</td></tr>
              <tr><th>下一步操作</th><td>HR 重新提交时说明本页差异，老板按当前批次号复核并审批。</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>部门口径变化</h2>
          <span className="badge amber">结构化差异</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>部门目标</th><td>{formatDelta(diff.summary.targetAmountCents.deltaCents)}</td></tr>
              <tr><th>自有车租金收入</th><td>{formatDelta(diff.summary.ownedVehicleRevenueAmountCents.deltaCents)}</td></tr>
              <tr><th>外调利润回款</th><td>{formatDelta(diff.summary.externalProfitAmountCents.deltaCents)}</td></tr>
              <tr><th>历史欠款本月回收</th><td>{formatDelta(diff.summary.historicalReceivableRecoveredAmountCents.deltaCents)}</td></tr>
              <tr><th>可计提收入</th><td>{formatDelta(diff.summary.confirmedRevenueAmountCents.deltaCents)}</td></tr>
              <tr><th>达成率</th><td>{formatBps(diff.summary.achievementRateBps.deltaCents)}</td></tr>
              <tr><th>适用提成比例</th><td>{formatBps(diff.summary.appliedCommissionRateBps.deltaCents)}</td></tr>
              <tr><th>部门提成池</th><td>{formatDelta(diff.summary.departmentCommissionPoolCents.deltaCents)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>个人明细变化</h2>
          <span className="badge green">按员工</span>
        </div>
        <div className="panel-body">
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
              {diff.lines.map((line) => (
                <tr key={line.userId}>
                  <td>{line.employeeName}</td>
                  <td>{formatDelta(line.confirmedContributionAmountCents.deltaCents)}</td>
                  <td>{formatBps(line.contributionRateBps.deltaCents)}</td>
                  <td>{formatDelta(line.grossCommissionCents.deltaCents)}</td>
                  <td>{formatDelta(line.currentPayoutCents.deltaCents)}</td>
                  <td>{formatDelta(line.futurePayoutCents.deltaCents)}</td>
                  <td>{formatDelta(line.adjustmentAmountCents.deltaCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
