import Link from "next/link";
import { notFound } from "next/navigation";
import { formatBps, formatCny } from "@/server/sample";
import { getTrialRun } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TrialRunDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getTrialRun(id);
  if (!detail) {
    notFound();
  }
  const latestRun = [...detail.settlementRuns].reverse()[0];
  const approvedRun = [...detail.settlementRuns].reverse().find((run) => ["APPROVED", "EXPORTED"].includes(run.status));
  const blockerCount = detail.issues.filter((issue) => issue.severity === "BLOCKER" && ["OPEN", "FIXING"].includes(issue.status)).length;
  const report = detail.reports[0];

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">{detail.trialRun.name}</h1>
          <p className="page-subtitle">
            Period {detail.trialRun.periodCode} / {detail.departmentName} / {detail.periodStatus}
          </p>
        </div>
        <span className={blockerCount > 0 ? "badge red" : "badge green"}>
          {blockerCount > 0 ? `${blockerCount} blocker` : "Can proceed"}
        </span>
      </header>

      <section className="metric-grid">
        <div className="metric">
          <span>Current runNo</span>
          <strong>{latestRun?.runNo ?? "-"}</strong>
        </div>
        <div className="metric">
          <span>Approved runNo</span>
          <strong>{approvedRun?.runNo ?? "-"}</strong>
        </div>
        <div className="metric">
          <span>Department revenue</span>
          <strong>{approvedRun ? formatCny(approvedRun.snapshot.confirmedRevenueAmountCents) : "-"}</strong>
        </div>
        <div className="metric">
          <span>Achievement</span>
          <strong>{approvedRun ? formatBps(approvedRun.snapshot.achievementRateBps) : "-"}</strong>
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-head">
            <h2>Settlement Versions</h2>
            <span className="badge blue">No overwrite</span>
          </div>
          <div className="panel-body">
            {detail.settlementRuns.length === 0 ? (
              <p className="empty-state">No settlement run has been calculated for this period.</p>
            ) : (
              <table className="data-table">
                <tbody>
                  {detail.settlementRuns.map((run) => (
                    <tr key={run.id}>
                      <th>{run.runNo}</th>
                      <td>{run.status}</td>
                      <td>{run.rejectionReason ?? "retained"}</td>
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
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Issues</h2>
            <span className="badge amber">{detail.issues.length}</span>
          </div>
          <div className="panel-body">
            {detail.issues.length === 0 ? (
              <p className="empty-state">No issue has been recorded.</p>
            ) : (
              <table className="data-table">
                <tbody>
                  {detail.issues.map((issue) => (
                    <tr key={issue.id}>
                      <th>{issue.title}</th>
                      <td>{issue.severity}</td>
                      <td>{issue.ownerRole}</td>
                      <td>{issue.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Report and Exports</h2>
          <span className="badge green">{approvedRun ? "approved binding" : "waiting approval"}</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr>
                <th>Report</th>
                <td>{report ? `${report.result} / ${report.approvalRunNo}` : "Not generated"}</td>
              </tr>
              <tr>
                <th>Export records</th>
                <td>{detail.exports.map((record) => `${record.fileName} -> ${record.runNo}`).join(", ") || "None"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
