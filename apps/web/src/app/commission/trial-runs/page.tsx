import Link from "next/link";
import { listSettlementRuns, listTrialRuns } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

export default async function TrialRunsPage() {
  const [trialRuns, settlementRuns] = await Promise.all([listTrialRuns(), listSettlementRuns()]);
  const approvedRun = settlementRuns.find((run) => ["APPROVED", "EXPORTED"].includes(run.status));
  const openIssueHint = trialRuns.length === 0 ? "Create a trial run after real-period import commit." : "Track issues, recalculation, approval, export, and report retention.";

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Trial Runs</h1>
          <p className="page-subtitle">{openIssueHint}</p>
        </div>
        <Link className="button-link" href="/commission/trial-runs/new">
          New Trial Run
        </Link>
      </header>

      <section className="metric-grid">
        <div className="metric">
          <span>Trial runs</span>
          <strong>{trialRuns.length}</strong>
        </div>
        <div className="metric">
          <span>Settlement runs</span>
          <strong>{settlementRuns.length}</strong>
        </div>
        <div className="metric">
          <span>Latest approved run</span>
          <strong>{approvedRun?.runNo ?? "-"}</strong>
        </div>
        <div className="metric">
          <span>Next role</span>
          <strong>{approvedRun ? "HR export" : "HR / Boss"}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Persisted Trial Runs</h2>
          <span className="badge blue">DB</span>
        </div>
        <div className="panel-body">
          {trialRuns.length === 0 ? (
            <p className="empty-state">No trial run has been created in the database yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Result</th>
                  <th>Started by</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {trialRuns.map((trialRun) => (
                  <tr key={trialRun.id}>
                    <td>{trialRun.name}</td>
                    <td>{trialRun.periodCode}</td>
                    <td>{trialRun.status}</td>
                    <td>{trialRun.result ?? "-"}</td>
                    <td>{trialRun.startedBy}</td>
                    <td>
                      <Link className="button-link secondary" href={`/commission/trial-runs/${trialRun.id}`}>
                        View
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
