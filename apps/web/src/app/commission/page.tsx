import { ShieldCheck } from "lucide-react";
import {
  acceptanceScenarioSettlement,
  formatBps,
  formatCny
} from "@/server/sample";
import { navItems } from "@/components/CommissionShell";

export default function CommissionDashboardPage() {
  const settlement = acceptanceScenarioSettlement;

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">提成结算工作台</h1>
          <p className="page-subtitle">
            2026-04 主验收场景已由计算引擎生成快照，展示部门达成、提成池和销售明细。
          </p>
        </div>
        <span className="badge green">
          <ShieldCheck aria-hidden="true" size={15} /> 计算引擎
        </span>
      </header>

      <section className="metric-grid" aria-label="结算指标">
        <div className="metric">
          <span>部门收入目标</span>
          <strong>{formatCny(settlement.targetAmountCents)}</strong>
        </div>
        <div className="metric">
          <span>部门实收收入</span>
          <strong>{formatCny(settlement.confirmedRevenueAmountCents)}</strong>
        </div>
        <div className="metric">
          <span>部门达成率</span>
          <strong>{formatBps(settlement.achievementRateBps)}</strong>
        </div>
        <div className="metric">
          <span>适用提成比例</span>
          <strong>{formatBps(settlement.appliedCommissionRateBps)}</strong>
        </div>
      </section>

      <div className="two-column">
        <section className="panel">
          <div className="panel-head">
            <h2>个人提成快照</h2>
            <span className="badge blue">PENDING_BOSS_APPROVAL</span>
          </div>
          <div className="panel-body">
            <table className="data-table">
              <thead>
                <tr>
                  <th>员工</th>
                  <th>个人贡献收入</th>
                  <th>贡献率</th>
                  <th>本期应发</th>
                  <th>后续待发</th>
                </tr>
              </thead>
              <tbody>
                {settlement.lines.map((line) => (
                  <tr key={line.userId}>
                    <td>{line.employeeName}</td>
                    <td>{formatCny(line.confirmedContributionAmountCents)}</td>
                    <td>{formatBps(line.contributionRateBps)}</td>
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
            <h2>模块入口</h2>
            <span className="badge amber">MVP</span>
          </div>
          <div className="panel-body module-list">
            {navItems.slice(1).map((item) => (
              <a className="module-item" href={item.href} key={item.href}>
                <strong>{item.label}</strong>
                <span>{item.href}</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

