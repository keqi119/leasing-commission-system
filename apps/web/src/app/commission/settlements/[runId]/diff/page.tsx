import { notFound } from "next/navigation";
import { formatBps, formatCny } from "@/server/sample";
import { createSampleTrialRunWorkflowStore, getSettlementRunDiff } from "@/server/trial-run-workflow";

type PageProps = {
  params: Promise<{ runId: string }>;
};

function formatDelta(cents: number) {
  const sign = cents > 0 ? "+" : "";
  return `${sign}${formatCny(cents)}`;
}

export default async function SettlementDiffPage({ params }: PageProps) {
  const { runId } = await params;
  const store = createSampleTrialRunWorkflowStore();
  const run = store.settlementRuns.find((candidate) => candidate.id === runId);
  const previous = run?.basedOnRunId ? store.settlementRuns.find((candidate) => candidate.id === run.basedOnRunId) : undefined;
  if (!run || !previous) {
    notFound();
  }
  const diff = getSettlementRunDiff(previous, run);

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">结算差异说明</h1>
          <p className="page-subtitle">
            对比 {diff.fromRunNo} 与 {diff.toRunNo}，用于老板审批前理解重算变化。
          </p>
        </div>
        <span className="badge blue">{diff.toRunNo}</span>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>部门口径差异</h2>
          <span className="badge amber">结构化差异</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>部门目标</th><td>{formatDelta(diff.summary.targetAmountCents.deltaCents)}</td></tr>
              <tr><th>自有车租金收入</th><td>{formatDelta(diff.summary.ownedVehicleRevenueAmountCents.deltaCents)}</td></tr>
              <tr><th>外调利润回款</th><td>{formatDelta(diff.summary.externalProfitAmountCents.deltaCents)}</td></tr>
              <tr><th>历史欠款回收</th><td>{formatDelta(diff.summary.historicalReceivableRecoveredAmountCents.deltaCents)}</td></tr>
              <tr><th>可计提收入</th><td>{formatDelta(diff.summary.confirmedRevenueAmountCents.deltaCents)}</td></tr>
              <tr><th>达成率变化</th><td>{formatBps(diff.summary.achievementRateBps.deltaCents)}</td></tr>
              <tr><th>适用提成比例变化</th><td>{formatBps(diff.summary.appliedCommissionRateBps.deltaCents)}</td></tr>
              <tr><th>部门提成池</th><td>{formatDelta(diff.summary.departmentCommissionPoolCents.deltaCents)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>个人差异</h2>
          <span className="badge green">按销售展示</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <thead>
              <tr>
                <th>员工</th>
                <th>贡献收入变化</th>
                <th>贡献率变化</th>
                <th>提成总额变化</th>
                <th>当期应发变化</th>
                <th>后续待发变化</th>
                <th>调整变化</th>
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
