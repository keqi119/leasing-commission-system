import { formatCny } from "@/server/sample";
import { listAdjustments } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

export default async function AdjustmentsPage() {
  const adjustments = await listAdjustments();

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Manual Adjustments</h1>
          <p className="page-subtitle">
            Adjustments are traceable records. They do not mutate original revenue ledgers and only enter a new run after approval.
          </p>
        </div>
        <span className="badge blue">{adjustments.length} records</span>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>Adjustment Records</h2>
          <span className="badge green">approval required</span>
        </div>
        <div className="panel-body">
          {adjustments.length === 0 ? (
            <p className="empty-state">No adjustment has been created.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>User</th>
                  <th>Type</th>
                  <th>Direction</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Applied run</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adjustment) => (
                  <tr key={adjustment.id}>
                    <td>{adjustment.periodCode}</td>
                    <td>{adjustment.userId}</td>
                    <td>{adjustment.adjustmentType}</td>
                    <td>{adjustment.direction}</td>
                    <td>{formatCny(adjustment.amountCents)}</td>
                    <td>{adjustment.status}</td>
                    <td>{adjustment.appliedRunId ?? "-"}</td>
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
