import Link from "next/link";
import { formatBps, formatCny } from "@/server/sample";
import { listAdjustments, listSettlementRuns } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

export default async function SettlementsPage() {
  const [runs, adjustments] = await Promise.all([listSettlementRuns(), listAdjustments()]);
  const latestRun = runs[0];
  const pendingAdjustmentCount = adjustments.filter((adjustment) => ["DRAFT", "SUBMITTED"].includes(adjustment.status)).length;

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">HR Settlement Runs</h1>
          <p className="page-subtitle">
            Every recalculation creates a new runNo and preserves rejected or approved history.
          </p>
        </div>
        <span className={pendingAdjustmentCount > 0 ? "badge amber" : "badge green"}>
          {pendingAdjustmentCount > 0 ? `${pendingAdjustmentCount} pending adjustment` : "ready for approval"}
        </span>
      </header>

      <section className="metric-grid">
        <div className="metric">
          <span>Latest runNo</span>
          <strong>{latestRun?.runNo ?? "-"}</strong>
        </div>
        <div className="metric">
          <span>Department target</span>
          <strong>{latestRun ? formatCny(latestRun.snapshot.targetAmountCents) : "-"}</strong>
        </div>
        <div className="metric">
          <span>Department revenue</span>
          <strong>{latestRun ? formatCny(latestRun.snapshot.confirmedRevenueAmountCents) : "-"}</strong>
        </div>
        <div className="metric">
          <span>Achievement</span>
          <strong>{latestRun ? formatBps(latestRun.snapshot.achievementRateBps) : "-"}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Run Versions</h2>
          <span className="badge blue">DB snapshots</span>
        </div>
        <div className="panel-body">
          {runs.length === 0 ? (
            <p className="empty-state">No settlement run yet. Import or enter data, then ask HR to calculate a run.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>runNo</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Revenue</th>
                  <th>Rate</th>
                  <th>Pool</th>
                  <th>Next step</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>{run.runNo}</td>
                    <td>{run.periodCode}</td>
                    <td>{run.status}</td>
                    <td>{formatCny(run.snapshot.confirmedRevenueAmountCents)}</td>
                    <td>{formatBps(run.snapshot.appliedCommissionRateBps)}</td>
                    <td>{formatCny(run.snapshot.departmentCommissionPoolCents)}</td>
                    <td>
                      <Link className="button-link secondary" href={`/commission/settlements/${run.id}/diff`}>
                        Diff
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
          <h2>Latest Line Snapshot</h2>
          <span className="badge green">calculation engine</span>
        </div>
        <div className="panel-body">
          {!latestRun ? (
            <p className="empty-state">No lines to display.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Contribution</th>
                  <th>Contribution rate</th>
                  <th>Gross commission</th>
                  <th>Current payable</th>
                  <th>Future payout</th>
                  <th>Adjustment</th>
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
