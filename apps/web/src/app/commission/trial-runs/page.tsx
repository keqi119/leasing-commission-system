import Link from "next/link";
import { createSampleTrialRunWorkflowStore } from "@/server/trial-run-workflow";

export default function TrialRunsPage() {
  const store = createSampleTrialRunWorkflowStore();
  const trialRun = store.trialRuns[0];
  const report = store.reports[0];
  const approvedRun = store.settlementRuns.find((run) => ["APPROVED", "EXPORTED"].includes(run.status));

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">真实账期试运行闭环</h1>
          <p className="page-subtitle">记录试运行问题、修正、重算、审批、导出和报告留存。</p>
        </div>
        <span className="badge green">{trialRun.result}</span>
      </header>

      <section className="metric-grid">
        <div className="metric">
          <span>当前周期状态</span>
          <strong>BOSS_APPROVED</strong>
        </div>
        <div className="metric">
          <span>最新正式 run</span>
          <strong>{approvedRun?.runNo}</strong>
        </div>
        <div className="metric">
          <span>发现问题</span>
          <strong>{report.issueCount}</strong>
        </div>
        <div className="metric">
          <span>已解决问题</span>
          <strong>{report.resolvedIssueCount}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>试运行批次</h2>
          <span className="badge blue">下一步：HR 留存报告</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>考核周期</th>
                <th>状态</th>
                <th>结论</th>
                <th>审批 runNo</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{trialRun.name}</td>
                <td>{trialRun.periodCode}</td>
                <td>{trialRun.status}</td>
                <td>{trialRun.result}</td>
                <td>{report.approvalRunNo}</td>
                <td>
                  <Link className="button-link secondary" href={`/commission/trial-runs/${trialRun.id}`}>
                    查看
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
