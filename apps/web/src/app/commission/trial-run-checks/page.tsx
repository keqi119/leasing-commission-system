import Link from "next/link";
import { issueCategoryLabel, issueSeverityLabel, roleLabel, yesNo } from "@/server/display-labels";
import { formatBps, formatCny } from "@/server/sample";
import { buildTrialRunCheckReportFromDb } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

export default async function TrialRunChecksPage() {
  const report = await buildTrialRunCheckReportFromDb();

  if (!report) {
    return (
      <>
        <header className="page-head">
          <div>
            <h1 className="page-title">试运行检查</h1>
            <p className="page-subtitle">请先导入或录入账期数据，再进行试运行检查。</p>
          </div>
          <span className="badge amber">暂无数据</span>
        </header>
      </>
    );
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">试运行检查</h1>
          <p className="page-subtitle">
            HR 和财务在结算前核对订单、租金收入、外调利润、押金和待审核事项是否干净。
          </p>
        </div>
        <span className={`badge ${report.canStartHrCalculation ? "green" : "amber"}`}>
          {report.canStartHrCalculation ? "可进入 HR 试算" : "需先清理数据"}
        </span>
      </header>

      <section className="metric-grid">
        <div className="metric">
          <span>当前账期</span>
          <strong>{report.periodCode}</strong>
        </div>
        <div className="metric">
          <span>账期状态</span>
          <strong>{report.periodStatus}</strong>
        </div>
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
          <h2>当前状态与下一步</h2>
          <span className={`badge ${report.canStartHrCalculation ? "green" : "amber"}`}>
            {report.canStartHrCalculation ? "HR 可试算" : "先处理问题"}
          </span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>当前账期</th><td>{report.periodCode}</td></tr>
              <tr><th>当前试运行</th><td>数据清理完成后，从试运行闭环页面新建或打开试运行</td></tr>
              <tr><th>当前结算批次</th><td>检查通过后由 HR 生成</td></tr>
              <tr><th>阻塞 / 重大问题建议</th><td>{report.issueSuggestions.filter((issue) => ["BLOCKER", "MAJOR"].includes(issue.severity)).length}</td></tr>
              <tr><th>是否可以提交审批</th><td>{report.canStartHrCalculation ? "是，HR 试算后再提交" : "否"}</td></tr>
              <tr><th>是否可以导出</th><td>否，必须先有老板审批通过的结算批次</td></tr>
              <tr>
                <th>下一步操作</th>
                <td>
                  {report.canStartHrCalculation
                    ? "HR 新建试运行并生成提成试算。"
                    : "为下方问题建议创建责任 issue，完成清理后再进入 HR 试算。"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>导入与台账数量</h2>
          <span className="badge blue">{report.periodCode}</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <tbody>
              <tr><th>部门</th><td>{report.departmentName}</td></tr>
              <tr><th>导入批次数量 / 来源</th><td>{report.importBatchCount} / {report.importBatchSources.join(", ")}</td></tr>
              <tr><th>员工数量</th><td>{report.employeeCount}</td></tr>
              <tr><th>车辆数量</th><td>{report.vehicleCount}</td></tr>
              <tr><th>订单数量</th><td>{report.orderCount}</td></tr>
              <tr><th>租金收入数量</th><td>{report.revenueReceiptCount}</td></tr>
              <tr><th>外调利润回款数量</th><td>{report.externalProfitReceiptCount}</td></tr>
              <tr><th>押金数量</th><td>{report.depositCount}</td></tr>
              <tr><th>车辆状态流水数量</th><td>{report.vehicleStatusEventCount}</td></tr>
              <tr><th>收入指标总额</th><td>{formatCny(report.targetTotalCents)}</td></tr>
              <tr><th>订单应收总额</th><td>{formatCny(report.orderReceivableCents)}</td></tr>
              <tr><th>已审核租金收入</th><td>{formatCny(report.approvedRentRevenueCents)}</td></tr>
              <tr><th>未审核租金收入</th><td>{formatCny(report.unapprovedRevenueCents)}</td></tr>
              <tr><th>已审核外调利润</th><td>{formatCny(report.approvedExternalProfitCents)}</td></tr>
              <tr><th>外调利润回款总额</th><td>{formatCny(report.externalProfitTotalCents)}</td></tr>
              <tr><th>历史欠款本月回收</th><td>{formatCny(report.historicalRecoveredCents)}</td></tr>
              <tr><th>押金总额</th><td>{formatCny(report.depositTotalCents)}</td></tr>
              <tr><th>异常押金数量</th><td>{report.abnormalDepositCount}</td></tr>
              <tr><th>未收款订单数量</th><td>{report.unpaidOrderCount}</td></tr>
              <tr><th>未审核收入数量</th><td>{report.pendingRevenueCount}</td></tr>
              <tr><th>待审批指标调整</th><td>{report.pendingTargetAdjustmentCount}</td></tr>
              <tr><th>已审批指标调整</th><td>{report.approvedTargetAdjustmentCount}</td></tr>
              <tr><th>是否可以进入 HR 试算</th><td>{yesNo(report.canStartHrCalculation)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>阻塞原因</h2>
          <span className="badge amber">{report.blockingReasons.length}</span>
        </div>
        <div className="panel-body">
          {report.blockingReasons.length === 0 ? (
            <p className="empty-state">
              暂无阻塞原因。可以继续进入 <Link href="/commission/trial-runs">试运行闭环</Link>。
            </p>
          ) : (
            <ul className="workflow-list">
              {report.blockingReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>问题建议</h2>
          <span className="badge amber">{report.issueSuggestions.length}</span>
        </div>
        <div className="panel-body">
          {report.issueSuggestions.length === 0 ? (
            <p className="empty-state">暂无问题建议，可以继续进入试运行闭环。</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>严重等级</th>
                  <th>责任角色</th>
                  <th>问题分类</th>
                  <th>标题</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {report.issueSuggestions.map((issue) => (
                  <tr key={`${issue.category}-${issue.title}`}>
                    <td>{issueSeverityLabel(issue.severity)}</td>
                    <td>{roleLabel(issue.ownerRole)}</td>
                    <td>{issueCategoryLabel(issue.category)}</td>
                    <td>{issue.title}</td>
                    <td>{issue.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
