import Link from "next/link";
import { createSampleTrialRunWorkflowStore } from "@/server/trial-run-workflow";

export default function ApprovalsPage() {
  const store = createSampleTrialRunWorkflowStore();
  const rejectedRun = store.settlementRuns.find((run) => run.status === "REJECTED");
  const approvedRun = store.settlementRuns.find((run) => ["APPROVED", "EXPORTED"].includes(run.status));

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">老板审批</h1>
          <p className="page-subtitle">老板可以驳回并填写原因；HR 修正后生成新 run，不覆盖历史版本。</p>
        </div>
        <span className="badge green">当前正式 {approvedRun?.runNo}</span>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>审批队列</h2>
          <span className="badge amber">审批前先看风险和差异</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <thead>
              <tr>
                <th>runNo</th>
                <th>状态</th>
                <th>审批人</th>
                <th>驳回原因 / 下一步</th>
              </tr>
            </thead>
            <tbody>
              {store.settlementRuns.map((run) => (
                <tr key={run.id}>
                  <td>{run.runNo}</td>
                  <td>{run.status}</td>
                  <td>{run.approvedBy ?? run.rejectedBy ?? "待处理"}</td>
                  <td>{run.rejectionReason ?? (run.id === approvedRun?.id ? "HR 可导出正式发放表" : "HR 提交老板审批")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rejectedRun && approvedRun ? (
            <p>
              <Link className="button-link" href={`/commission/settlements/${approvedRun.id}/diff`}>
                查看重算差异说明
              </Link>
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}
