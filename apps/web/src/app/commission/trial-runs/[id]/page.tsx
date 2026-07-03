import Link from "next/link";
import { notFound } from "next/navigation";
import { formatBps, formatCny } from "@/server/sample";
import { createSampleTrialRunWorkflowStore } from "@/server/trial-run-workflow";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TrialRunDetailPage({ params }: PageProps) {
  const { id } = await params;
  const store = createSampleTrialRunWorkflowStore();
  const trialRun = store.trialRuns.find((candidate) => candidate.id === id);
  if (!trialRun) {
    notFound();
  }
  const report = store.reports.find((candidate) => candidate.trialRunId === trialRun.id)!;
  const issues = store.issues.filter((issue) => issue.trialRunId === trialRun.id);
  const approvedRun = store.settlementRuns.find((run) => run.runNo === report.approvalRunNo)!;
  const previousRun = store.settlementRuns.find((run) => run.id === approvedRun.basedOnRunId);

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">{trialRun.name}</h1>
          <p className="page-subtitle">试运行报告绑定 approved run，历史 run、驳回原因和导出记录均保留。</p>
        </div>
        <span className="badge green">{trialRun.status}</span>
      </header>

      <section className="metric-grid">
        <div className="metric">
          <span>部门实收</span>
          <strong>{formatCny(report.confirmedRevenueAmountCents)}</strong>
        </div>
        <div className="metric">
          <span>达成率</span>
          <strong>{formatBps(report.achievementRateBps)}</strong>
        </div>
        <div className="metric">
          <span>提成池</span>
          <strong>{formatCny(report.commissionPoolCents)}</strong>
        </div>
        <div className="metric">
          <span>人工调整</span>
          <strong>{formatCny(report.adjustmentTotalCents)}</strong>
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-head">
            <h2>run 版本</h2>
            <span className="badge blue">不覆盖历史</span>
          </div>
          <div className="panel-body">
            <table className="data-table">
              <tbody>
                {store.settlementRuns.map((run) => (
                  <tr key={run.id}>
                    <th>{run.runNo}</th>
                    <td>{run.status}</td>
                    <td>{run.rejectionReason ?? "已进入闭环"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previousRun ? (
              <p>
                <Link className="button-link" href={`/commission/settlements/${approvedRun.id}/diff`}>
                  查看 {previousRun.runNo} 与 {approvedRun.runNo} 差异
                </Link>
              </p>
            ) : null}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>问题清单</h2>
            <span className="badge amber">{issues.length}</span>
          </div>
          <div className="panel-body">
            <table className="data-table">
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.id}>
                    <th>{issue.title}</th>
                    <td>{issue.ownerRole}</td>
                    <td>{issue.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
