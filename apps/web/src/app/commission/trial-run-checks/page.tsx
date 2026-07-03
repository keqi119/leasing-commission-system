import Link from "next/link";
import { formatBps, formatCny } from "@/server/sample";
import { buildTrialRunCheckReportFromDb } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

export default async function TrialRunChecksPage() {
  const report = await buildTrialRunCheckReportFromDb();

  if (!report) {
    return (
      <>
        <header className="page-head">
          <div>
            <h1 className="page-title">Trial Run Checks</h1>
            <p className="page-subtitle">Import or enter a period before running checks.</p>
          </div>
          <span className="badge amber">no data</span>
        </header>
      </>
    );
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Trial Run Checks</h1>
          <p className="page-subtitle">
            HR and finance check whether orders, revenue, external profit, deposits, and pending reviews are clean before settlement.
          </p>
        </div>
        <span className={`badge ${report.canStartHrCalculation ? "green" : "amber"}`}>
          {report.canStartHrCalculation ? "Ready" : "Needs cleanup"}
        </span>
      </header>

      <section className="metric-grid">
        <div className="metric">
          <span>Department target</span>
          <strong>{formatCny(report.departmentTargetCents)}</strong>
        </div>
        <div className="metric">
          <span>Commissionable revenue</span>
          <strong>{formatCny(report.commissionableRevenueCents)}</strong>
        </div>
        <div className="metric">
          <span>Achievement</span>
          <strong>{formatBps(report.achievementRateBps)}</strong>
        </div>
        <div className="metric">
          <span>Estimated pool</span>
          <strong>{formatCny(report.estimatedCommissionPoolCents)}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Check Report</h2>
          <span className="badge blue">{report.periodCode}</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>Department</th><td>{report.departmentName}</td></tr>
              <tr><th>Order receivable</th><td>{formatCny(report.orderReceivableCents)}</td></tr>
              <tr><th>Approved rent revenue</th><td>{formatCny(report.approvedRentRevenueCents)}</td></tr>
              <tr><th>Approved external profit</th><td>{formatCny(report.approvedExternalProfitCents)}</td></tr>
              <tr><th>Historical recovered</th><td>{formatCny(report.historicalRecoveredCents)}</td></tr>
              <tr><th>Deposit total</th><td>{formatCny(report.depositTotalCents)}</td></tr>
              <tr><th>Abnormal deposits</th><td>{report.abnormalDepositCount}</td></tr>
              <tr><th>Unpaid orders</th><td>{report.unpaidOrderCount}</td></tr>
              <tr><th>Pending revenue</th><td>{report.pendingRevenueCount}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Blocking Reasons</h2>
          <span className="badge amber">{report.blockingReasons.length}</span>
        </div>
        <div className="panel-body">
          {report.blockingReasons.length === 0 ? (
            <p className="empty-state">
              No blocker. Continue to <Link href="/commission/trial-runs">trial run workflow</Link>.
            </p>
          ) : (
            <ul className="workflow-list">
              {report.blockingReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
