import { buildTrialRunCheckReport, createDefaultImportContext } from "@/server/imports";
import { formatBps, formatCny } from "@/server/sample";

export default function TrialRunChecksPage() {
  const report = buildTrialRunCheckReport(createDefaultImportContext(), "2026-04");

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">试运行数据校验</h1>
          <p className="page-subtitle">
            HR 和财务在正式试算前检查订单、收入、外调利润、押金和未审核数据是否干净。
          </p>
        </div>
        <span className={`badge ${report.canStartHrCalculation ? "green" : "amber"}`}>
          {report.canStartHrCalculation ? "可以试算" : "需先处理"}
        </span>
      </header>

      <section className="metric-grid">
        <div className="metric">
          <span>部门目标</span>
          <strong>{formatCny(report.departmentTargetCents)}</strong>
        </div>
        <div className="metric">
          <span>可计提收入</span>
          <strong>{formatCny(report.commissionableRevenueCents)}</strong>
        </div>
        <div className="metric">
          <span>达成率</span>
          <strong>{formatBps(report.achievementRateBps)}</strong>
        </div>
        <div className="metric">
          <span>预计提成池</span>
          <strong>{formatCny(report.estimatedCommissionPoolCents)}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>数据校验报表</h2>
          <span className="badge blue">{report.periodCode}</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>订单应收</th><td>{formatCny(report.orderReceivableCents)}</td></tr>
              <tr><th>已审核租金收入</th><td>{formatCny(report.approvedRentRevenueCents)}</td></tr>
              <tr><th>已审核外调利润</th><td>{formatCny(report.approvedExternalProfitCents)}</td></tr>
              <tr><th>历史欠款回收</th><td>{formatCny(report.historicalRecoveredCents)}</td></tr>
              <tr><th>押金总额</th><td>{formatCny(report.depositTotalCents)}</td></tr>
              <tr><th>异常押金数量</th><td>{report.abnormalDepositCount}</td></tr>
              <tr><th>未收款订单数量</th><td>{report.unpaidOrderCount}</td></tr>
              <tr><th>未审核收入数量</th><td>{report.pendingRevenueCount}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-head">
            <h2>阻断项</h2>
            <span className="badge amber">{report.blockingReasons.length}</span>
          </div>
          <div className="panel-body">
            {report.blockingReasons.length === 0 ? (
              <p className="empty-state">没有阻断项，可以进入 HR 试算。</p>
            ) : (
              <ul className="workflow-list">
                {report.blockingReasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            )}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <h2>风险提示</h2>
            <span className="badge red">{report.warnings.length}</span>
          </div>
          <div className="panel-body">
            {report.warnings.length === 0 ? (
              <p className="empty-state">没有需要 HR 特别确认的风险提示。</p>
            ) : (
              <ul className="workflow-list">
                {report.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
