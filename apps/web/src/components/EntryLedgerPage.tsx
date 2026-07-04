import Link from "next/link";
import { createDefaultImportContext } from "@/server/imports";
import { formatCny } from "@/server/sample";

type LedgerKind = "orders" | "revenue" | "external-profit" | "deposits";

const pageConfig = {
  orders: {
    title: "订单台账",
    subtitle: "销售按考核周期登记订单归属、客户、车辆和应收租金；未收款订单只形成应收，不参与提成。",
    statusLabel: "订单状态",
    primaryLabel: "订单号",
    secondaryLabel: "客户与车辆",
    amountLabel: "应收租金",
    rows: buildOrderRows
  },
  revenue: {
    title: "租金收入台账",
    subtitle: "财务审核进入公司账户的租金收入，已审核且可计提后进入本期试算。",
    statusLabel: "财务审核状态",
    primaryLabel: "订单号",
    secondaryLabel: "收入口径",
    amountLabel: "收款金额",
    rows: buildRevenueRows
  },
  "external-profit": {
    title: "外调利润回款台账",
    subtitle: "外调订单只登记销售打回公司的利润，不做外调收入和成本核算。",
    statusLabel: "财务审核状态",
    primaryLabel: "订单号",
    secondaryLabel: "外调利润口径",
    amountLabel: "外调利润金额",
    rows: buildExternalProfitRows
  },
  deposits: {
    title: "押金台账",
    subtitle: "押金只记录收取、暂管人和退还状态，不进入收入，也不参与提成。",
    statusLabel: "退还状态",
    primaryLabel: "订单号",
    secondaryLabel: "押金暂管人",
    amountLabel: "押金金额",
    rows: buildDepositRows
  }
} as const;

interface LedgerRow {
  primary: string;
  secondary: string;
  salesperson: string;
  amount: string;
  status: string;
  statusTone: "green" | "amber" | "red" | "blue";
  source: string;
  remark: string;
}

export function EntryLedgerPage({ kind }: { kind: LedgerKind }) {
  const config = pageConfig[kind];
  const context = createDefaultImportContext();
  const rows = config.rows(context);

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">{config.title}</h1>
          <p className="page-subtitle">{config.subtitle}</p>
        </div>
        <Link className="button-link" href={`/commission/imports?type=${kind}`}>
          导入数据
        </Link>
      </header>

      <section className="panel">
        <div className="panel-body filter-bar">
          <label>
            考核周期
            <select defaultValue="2026-04">
              <option>2026-04</option>
              <option>2026-05</option>
            </select>
          </label>
          <label>
            销售
            <select defaultValue="ALL">
              <option value="ALL">全部销售</option>
              <option>销售 A</option>
              <option>销售 B</option>
              <option>销售 C</option>
            </select>
          </label>
          <label>
            {config.statusLabel}
            <select defaultValue="ALL">
              <option value="ALL">全部状态</option>
              <option>APPROVED</option>
              <option>PENDING</option>
              <option>DISPUTED</option>
            </select>
          </label>
          <span className="badge blue">金额统一按元展示</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>试运行数据</h2>
          <span className="badge green">手工录入 / 导入 / 种子数据</span>
        </div>
        <div className="panel-body">
          {rows.length === 0 ? (
            <div className="empty-state">
              当前筛选条件下没有数据。请先手工录入，或进入导入页面下载标准模板并上传预览。
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{config.primaryLabel}</th>
                  <th>{config.secondaryLabel}</th>
                  <th>销售</th>
                  <th>{config.amountLabel}</th>
                  <th>{config.statusLabel}</th>
                  <th>数据来源</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.primary}-${row.secondary}`}>
                    <td>{row.primary}</td>
                    <td>{row.secondary}</td>
                    <td>{row.salesperson}</td>
                    <td>{row.amount}</td>
                    <td>
                      <span className={`badge ${row.statusTone}`}>{row.status}</span>
                    </td>
                    <td>{row.source}</td>
                    <td>{row.remark}</td>
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

type ImportContextLike = ReturnType<typeof createDefaultImportContext>;

function buildOrderRows(context: ImportContextLike): LedgerRow[] {
  return context.orders.map((order) => ({
    primary: order.orderNo,
    secondary: `${order.customerName} / ${order.plateNo}`,
    salesperson: order.salesName,
    amount: formatCny(order.receivableRentAmountCents),
    status: order.orderStatus,
    statusTone: order.orderStatus === "COMPLETED" ? "green" : "amber",
    source: order.dataSource,
    remark: order.receivableRentAmountCents > 0 ? "未收款部分只形成应收" : "外调订单仅以后续利润回款计提"
  }));
}

function buildRevenueRows(context: ImportContextLike): LedgerRow[] {
  return context.revenueReceipts.map((receipt) => {
    const order = context.orders.find((candidate) => candidate.orderNo === receipt.orderNo);
    return {
      primary: receipt.orderNo,
      secondary: receipt.revenueKind === "HISTORICAL_RECEIVABLE" ? "历史欠款本月回收" : "本期租金",
      salesperson: order?.salesName ?? receipt.salesUserId,
      amount: formatCny(receipt.receiptAmountCents),
      status: receipt.financeReviewStatus,
      statusTone: receipt.financeReviewStatus === "APPROVED" ? "green" : "amber",
      source: receipt.dataSource,
      remark: receipt.isCommissionable ? "审核通过后参与提成" : "不参与提成"
    };
  });
}

function buildExternalProfitRows(context: ImportContextLike): LedgerRow[] {
  return context.externalProfitReceipts.map((receipt) => {
    const order = context.orders.find((candidate) => candidate.orderNo === receipt.orderNo);
    return {
      primary: receipt.orderNo,
      secondary: "只记录打回公司的外调利润",
      salesperson: order?.salesName ?? receipt.salesUserId,
      amount: formatCny(receipt.profitAmountCents),
      status: receipt.financeReviewStatus,
      statusTone: receipt.financeReviewStatus === "APPROVED" ? "green" : "amber",
      source: receipt.dataSource,
      remark: "不导入外调收入和外调成本"
    };
  });
}

function buildDepositRows(context: ImportContextLike): LedgerRow[] {
  return context.deposits.map((deposit) => {
    const order = context.orders.find((candidate) => candidate.orderNo === deposit.orderNo);
    return {
      primary: deposit.orderNo,
      secondary: `暂管人 ${deposit.holderUserId}`,
      salesperson: order?.salesName ?? deposit.salesUserId,
      amount: formatCny(deposit.depositAmountCents),
      status: deposit.refundStatus,
      statusTone: deposit.refundStatus === "DISPUTED" ? "red" : "blue",
      source: deposit.dataSource,
      remark: "押金不计收入，不参与提成"
    };
  });
}
