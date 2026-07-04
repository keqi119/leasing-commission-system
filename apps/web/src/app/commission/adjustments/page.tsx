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
          <h1 className="page-title">Manual Adjustments</h1>
          <p className="page-subtitle">
            Adjustments are traceable records. They do not mutate original revenue ledgers and only enter a new run after approval.
          </p>
        </div>
        <span className={pendingAdjustmentCount > 0 ? "badge amber" : "badge blue"}>
          {pendingAdjustmentCount > 0 ? `${pendingAdjustmentCount} pending` : `${adjustments.length} records`}
        </span>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>Current Status / Next Step</h2>
          <span className={pendingAdjustmentCount > 0 ? "badge amber" : "badge green"}>
            {pendingAdjustmentCount > 0 ? "approval needed" : "ready"}
          </span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>Current period</th><td>{adjustments[0]?.periodCode ?? "-"}</td></tr>
              <tr><th>Current Trial Run</th><td>See Trial Runs detail for linked period</td></tr>
              <tr><th>Current Settlement Run</th><td>{runs[0]?.runNo ?? "-"}</td></tr>
              <tr><th>Pending adjustments</th><td>{pendingAdjustmentCount}</td></tr>
              <tr><th>Applied adjustments</th><td>{appliedAdjustmentCount}</td></tr>
              <tr><th>Can submit approval</th><td>{pendingAdjustmentCount > 0 ? "No, unless HR explicitly excludes pending adjustments" : "Yes, after settlement calculation"}</td></tr>
              <tr><th>Can export</th><td>Only after boss-approved run</td></tr>
              <tr>
                <th>Next action</th>
                <td>
                  {pendingAdjustmentCount > 0
                    ? `不能提交审批：还有 ${pendingAdjustmentCount} 条人工调整未审批。`
                    : "审批后的人工调整只能进入新 run，已进入 run 的调整不可直接修改。"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

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
                  <th>Requested by</th>
                  <th>Approved by</th>
                  <th>Evidence</th>
                  <th>Reason</th>
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
