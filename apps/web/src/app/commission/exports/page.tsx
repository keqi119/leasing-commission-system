import { listExportBindings, listSettlementRuns } from "@/server/trial-run-db-workflow";
import { buildExportGuidance } from "@/server/db-workflow-status";

export const dynamic = "force-dynamic";

export default async function ExportsPage() {
  const [exports, runs] = await Promise.all([listExportBindings(), listSettlementRuns()]);
  const exportableRuns = runs.filter((run) => ["APPROVED", "EXPORTED"].includes(run.status));
  const latestRun = runs[0];
  const latestApprovedRun = exportableRuns[0];
  const exportGuidance = buildExportGuidance({
    runNo: latestApprovedRun?.runNo ?? latestRun?.runNo,
    status: latestApprovedRun?.status ?? latestRun?.status
  });
  const blockedRuns = runs.filter((run) => !["APPROVED", "EXPORTED"].includes(run.status));

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Bonus Export Records</h1>
          <p className="page-subtitle">
            Formal payout files can only be generated from boss-approved runs and always retain runId / runNo binding.
          </p>
        </div>
        <span className="badge green">{exportableRuns.length} approved run</span>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>Current Status / Next Step</h2>
          <span className={`badge ${exportGuidance.canExport ? "green" : "amber"}`}>
            {exportGuidance.canExport ? "can export" : "cannot export"}
          </span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>Current period</th><td>{latestApprovedRun?.periodCode ?? latestRun?.periodCode ?? "-"}</td></tr>
              <tr><th>Current Trial Run</th><td>Report must reference the approved run</td></tr>
              <tr><th>Current Settlement Run</th><td>{latestApprovedRun?.runNo ?? latestRun?.runNo ?? "-"}</td></tr>
              <tr><th>Current status</th><td>{latestApprovedRun?.status ?? latestRun?.status ?? "No run"}</td></tr>
              <tr><th>Can submit approval</th><td>{latestRun?.status === "CALCULATED" ? "Yes, after blockers and pending adjustments are clear" : "No"}</td></tr>
              <tr><th>Can export</th><td>{exportGuidance.canExport ? "Yes" : "No"}</td></tr>
              <tr><th>Next role</th><td>{exportGuidance.nextRole}</td></tr>
              <tr><th>Next action</th><td>{exportGuidance.message}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Export Bindings</h2>
          <span className="badge blue">HR</span>
        </div>
        <div className="panel-body">
          {exports.length === 0 ? (
            <p className="empty-state">No formal export has been recorded. Approve a settlement run first.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Bound runNo</th>
                  <th>Period</th>
                  <th>Exported by</th>
                  <th>Exported at</th>
                </tr>
              </thead>
              <tbody>
                {exports.map((record) => (
                  <tr key={record.id}>
                    <td>{record.fileName}</td>
                    <td>{record.runNo}</td>
                    <td>{record.periodCode}</td>
                    <td>{record.exportedBy}</td>
                    <td>{record.exportedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Exportable Runs</h2>
          <span className="badge green">approved only</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              {exportableRuns.map((run) => (
                <tr key={run.id}>
                  <th>{run.runNo}</th>
                  <td>{run.status}</td>
                  <td>{run.approvedBy ?? "-"}</td>
                  <td>{run.approvedAt ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Blocked Runs</h2>
          <span className="badge amber">{blockedRuns.length} blocked</span>
        </div>
        <div className="panel-body">
          {blockedRuns.length === 0 ? (
            <p className="empty-state">No blocked run. Use the approved run above for formal export.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>runNo</th>
                  <th>Status</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {blockedRuns.map((run) => {
                  const guidance = buildExportGuidance({ runNo: run.runNo, status: run.status });
                  return (
                    <tr key={run.id}>
                      <td>{run.runNo}</td>
                      <td>{run.status}</td>
                      <td>{guidance.message}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
