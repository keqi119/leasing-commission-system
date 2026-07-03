import { createSampleTrialRunWorkflowStore } from "@/server/trial-run-workflow";

export default function ExportsPage() {
  const store = createSampleTrialRunWorkflowStore();

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">奖金发放导出记录</h1>
          <p className="page-subtitle">正式导出只能绑定老板审批通过的 run，rejected run 不允许导出。</p>
        </div>
        <span className="badge green">绑定 approved runNo</span>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>导出记录</h2>
          <span className="badge blue">HR</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <thead>
              <tr>
                <th>文件名</th>
                <th>绑定 runNo</th>
                <th>导出人</th>
                <th>导出时间</th>
              </tr>
            </thead>
            <tbody>
              {store.exports.map((record) => (
                <tr key={record.id}>
                  <td>{record.fileName}</td>
                  <td>{record.runNo}</td>
                  <td>{record.exportedBy}</td>
                  <td>{record.exportedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="empty-state">禁止导出原因示例：run 未审批、run 已驳回、周期处于重开修正中。</p>
        </div>
      </section>
    </>
  );
}
