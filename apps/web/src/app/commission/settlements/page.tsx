import {
  acceptanceScenarioSettlement,
  formatBps,
  formatCny
} from "@/server/sample";

export default function SettlementsPage() {
  const settlement = acceptanceScenarioSettlement;

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">HR 提成试算</h1>
          <p className="page-subtitle">
            本页展示计算快照字段，API 导出时使用同一份快照结果。
          </p>
        </div>
        <span className="badge amber">PENDING_BOSS_APPROVAL</span>
      </header>

      <section className="metric-grid">
        <div className="metric">
          <span>部门目标</span>
          <strong>{formatCny(settlement.targetAmountCents)}</strong>
        </div>
        <div className="metric">
          <span>部门实收</span>
          <strong>{formatCny(settlement.confirmedRevenueAmountCents)}</strong>
        </div>
        <div className="metric">
          <span>提成池</span>
          <strong>{formatCny(settlement.departmentCommissionPoolCents)}</strong>
        </div>
        <div className="metric">
          <span>押金异常</span>
          <strong>{settlement.depositRiskCount}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>试算明细</h2>
          <span className="badge blue">
            达成率 {formatBps(settlement.achievementRateBps)}
          </span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <thead>
              <tr>
                <th>员工</th>
                <th>个人贡献收入</th>
                <th>个人贡献率</th>
                <th>个人提成总额</th>
                <th>当期应发</th>
                <th>季度待发</th>
                <th>年终待发</th>
                <th>冻结金额</th>
                <th>最终当期应发</th>
                <th>后续待发合计</th>
              </tr>
            </thead>
            <tbody>
              {settlement.lines.map((line) => (
                <tr key={line.userId}>
                  <td>{line.employeeName}</td>
                  <td>{formatCny(line.confirmedContributionAmountCents)}</td>
                  <td>{formatBps(line.contributionRateBps)}</td>
                  <td>{formatCny(line.grossCommissionCents)}</td>
                  <td>{formatCny(line.currentPayoutCents)}</td>
                  <td>{formatCny(line.quarterlyDeferredCents)}</td>
                  <td>{formatCny(line.yearEndDeferredCents)}</td>
                  <td>{formatCny(line.frozenAmountCents)}</td>
                  <td>{formatCny(line.finalCurrentPayableCents)}</td>
                  <td>{formatCny(line.futurePayoutCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>快照收入来源</h2>
          <span className="badge green">
            适用比例 {formatBps(settlement.appliedCommissionRateBps)}
          </span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr>
                <th>自有车租金收入</th>
                <td>{formatCny(settlement.ownedVehicleRevenueAmountCents)}</td>
              </tr>
              <tr>
                <th>外调利润回款</th>
                <td>{formatCny(settlement.externalProfitAmountCents)}</td>
              </tr>
              <tr>
                <th>历史欠款本月回收</th>
                <td>
                  {formatCny(
                    settlement.historicalReceivableRecoveredAmountCents
                  )}
                </td>
              </tr>
              <tr>
                <th>审批状态</th>
                <td>PENDING_BOSS_APPROVAL</td>
              </tr>
              <tr>
                <th>审批人</th>
                <td>待老板审批</td>
              </tr>
              <tr>
                <th>审批时间</th>
                <td>待审批</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

