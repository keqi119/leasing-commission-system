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
          <h1 className="page-title">Settlement Diff</h1>
          <p className="page-subtitle">
            Comparing {diff.fromRunNo} to {diff.toRunNo}. The old run is retained and the new run has its own snapshot.
          </p>
        </div>
        <span className="badge blue">{diff.toRunNo}</span>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>Department Changes</h2>
          <span className="badge amber">structured diff</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>Target</th><td>{formatDelta(diff.summary.targetAmountCents.deltaCents)}</td></tr>
              <tr><th>Owned rent</th><td>{formatDelta(diff.summary.ownedVehicleRevenueAmountCents.deltaCents)}</td></tr>
              <tr><th>External profit</th><td>{formatDelta(diff.summary.externalProfitAmountCents.deltaCents)}</td></tr>
              <tr><th>Historical receivable recovered</th><td>{formatDelta(diff.summary.historicalReceivableRecoveredAmountCents.deltaCents)}</td></tr>
              <tr><th>Commissionable revenue</th><td>{formatDelta(diff.summary.confirmedRevenueAmountCents.deltaCents)}</td></tr>
              <tr><th>Achievement rate</th><td>{formatBps(diff.summary.achievementRateBps.deltaCents)}</td></tr>
              <tr><th>Applied commission rate</th><td>{formatBps(diff.summary.appliedCommissionRateBps.deltaCents)}</td></tr>
              <tr><th>Commission pool</th><td>{formatDelta(diff.summary.departmentCommissionPoolCents.deltaCents)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Line Changes</h2>
          <span className="badge green">by employee</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Contribution</th>
                <th>Contribution rate</th>
                <th>Gross</th>
                <th>Current</th>
                <th>Future</th>
                <th>Adjustment</th>
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
