import { listExportBindings, listSettlementRuns } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

export default async function ExportsPage() {
  const [exports, runs] = await Promise.all([listExportBindings(), listSettlementRuns()]);
  const exportableRuns = runs.filter((run) => ["APPROVED", "EXPORTED"].includes(run.status));

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
    </>
  );
}
