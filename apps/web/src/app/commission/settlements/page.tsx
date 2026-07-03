import { acceptanceDepartmentName } from "@lcs/commission-engine";
import {
  acceptanceScenarioSettlement,
  formatBps,
  formatCny
} from "@/server/sample";
import { buildSettlementDisplayRows } from "@/server/settlement-presenter";

const pageMeta = {
  approvalStatus: "PENDING_BOSS_APPROVAL",
  approvedBy: "待老板审批",
  approvedAt: "待审批",
  departmentName: acceptanceDepartmentName
};

function formatYuan(yuan: number): string {
  return formatCny(Math.round(yuan * 100));
}

export default function SettlementsPage() {
  const settlement = acceptanceScenarioSettlement;
  const displayRows = buildSettlementDisplayRows(settlement, pageMeta);

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">HR 提成试算</h1>
          <p className="page-subtitle">
            本页展示计算快照字段，页面、API 和导出表使用同一套计算结果。
          </p>
        </div>
        <span className="badge amber">{pageMeta.approvalStatus}</span>
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
              {displayRows.map((row) => (
                <tr key={row.employeeName}>
                  <td>{row.employeeName}</td>
                  <td>{formatYuan(row.personalContributionYuan)}</td>
                  <td>{row.contributionRateText}</td>
                  <td>{formatYuan(row.grossCommissionYuan)}</td>
                  <td>{formatYuan(row.currentPayoutYuan)}</td>
                  <td>{formatYuan(row.quarterlyDeferredYuan)}</td>
                  <td>{formatYuan(row.yearEndDeferredYuan)}</td>
                  <td>{formatYuan(row.frozenAmountYuan)}</td>
                  <td>{formatYuan(row.finalCurrentPayableYuan)}</td>
                  <td>{formatYuan(row.futurePayoutYuan)}</td>
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
                <td>{pageMeta.approvalStatus}</td>
              </tr>
              <tr>
                <th>审批人</th>
                <td>{pageMeta.approvedBy}</td>
              </tr>
              <tr>
                <th>审批时间</th>
                <td>{pageMeta.approvedAt}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
