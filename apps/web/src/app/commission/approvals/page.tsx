import Link from "next/link";
import { listSettlementRuns } from "@/server/trial-run-db-workflow";
import { buildExportGuidance } from "@/server/db-workflow-status";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const runs = await listSettlementRuns();
  const pendingRuns = runs.filter((run) => run.status === "SUBMITTED");
  const latestApproved = runs.find((run) => ["APPROVED", "EXPORTED"].includes(run.status));
  const currentRun = pendingRuns[0] ?? runs[0];
  const exportGuidance = buildExportGuidance({ runNo: latestApproved?.runNo ?? currentRun?.runNo, status: latestApproved?.status ?? currentRun?.status });

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Boss Approval</h1>
          <p className="page-subtitle">
            Boss can reject a submitted run with a reason. HR recalculates a new runNo after data correction.
          </p>
        </div>
        <span className={pendingRuns.length > 0 ? "badge amber" : "badge green"}>
          {pendingRuns.length > 0 ? `${pendingRuns.length} pending` : `official ${latestApproved?.runNo ?? "-"}`}
        </span>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>Current Status / Next Step</h2>
          <span className={pendingRuns.length > 0 ? "badge amber" : exportGuidance.canExport ? "badge green" : "badge blue"}>
            {pendingRuns.length > 0 ? "boss review" : exportGuidance.canExport ? "approved" : "waiting submit"}
          </span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>Current period</th><td>{currentRun?.periodCode ?? "-"}</td></tr>
              <tr><th>Current Trial Run</th><td>Review linked issue and report from Trial Runs</td></tr>
              <tr><th>Current Settlement Run</th><td>{currentRun?.runNo ?? "-"}</td></tr>
              <tr><th>Current status</th><td>{currentRun?.status ?? "No run"}</td></tr>
              <tr><th>Can submit approval</th><td>{pendingRuns.length > 0 ? "Already submitted" : "HR submits from settlement workflow"}</td></tr>
              <tr><th>Can export</th><td>{exportGuidance.canExport ? "Yes" : "No"}</td></tr>
              <tr><th>Next role</th><td>{pendingRuns.length > 0 ? "老板" : exportGuidance.nextRole}</td></tr>
              <tr>
                <th>Next action</th>
                <td>
                  {pendingRuns.length > 0
                    ? `老板审批或驳回结算批次 ${pendingRuns[0].runNo}；驳回必须填写原因。`
                    : exportGuidance.message}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Approval Queue</h2>
          <span className="badge blue">DB workflow</span>
        </div>
        <div className="panel-body">
          {runs.length === 0 ? (
            <p className="empty-state">No settlement run is waiting for approval.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>runNo</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Submitted by</th>
                  <th>Approved / rejected by</th>
                  <th>Reason / action</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>{run.runNo}</td>
                    <td>{run.periodCode}</td>
                    <td>{run.status}</td>
                    <td>{run.submittedBy ?? "-"}</td>
                    <td>{run.approvedBy ?? run.rejectedBy ?? "-"}</td>
                    <td>
                      {run.rejectionReason ? (
                        run.rejectionReason
                      ) : (
                        <Link className="button-link secondary" href={`/commission/settlements/${run.id}/diff`}>
                          Review diff
                        </Link>
                      )}
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
