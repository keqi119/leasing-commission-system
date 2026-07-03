import { buildTrialRunCheckReportFromDb } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

export default async function NewTrialRunPage() {
  const report = await buildTrialRunCheckReportFromDb();

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">New Trial Run</h1>
          <p className="page-subtitle">
            Create through POST /api/commission/trial-runs after preview/commit of the real-period data package.
          </p>
        </div>
        <span className={`badge ${report?.canStartHrCalculation ? "green" : "amber"}`}>
          {report?.canStartHrCalculation ? "ready" : "check data first"}
        </span>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>Creation Payload</h2>
          <span className="badge blue">HR</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>API</th><td>POST /api/commission/trial-runs</td></tr>
              <tr><th>periodCode</th><td>{report?.periodCode ?? "2026-05"}</td></tr>
              <tr><th>name</th><td>{report ? `${report.periodCode} first real-period trial run` : "Real-period trial run"}</td></tr>
              <tr><th>Blocked when</th><td>Data checks fail or no period has been imported.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
