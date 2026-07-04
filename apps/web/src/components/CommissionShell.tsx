import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  Car,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Gauge,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  ReceiptText,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  UserRoundCog,
  WalletCards
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export const navItems = [
  { href: "/commission", label: "提成首页", icon: LayoutDashboard },
  { href: "/commission/periods", label: "考核周期", icon: CalendarDays },
  { href: "/commission/targets", label: "收入指标", icon: Target },
  { href: "/commission/rules", label: "提成规则", icon: SlidersHorizontal },
  { href: "/commission/imports", label: "数据导入", icon: FileSpreadsheet },
  { href: "/commission/orders", label: "订单台账", icon: ReceiptText },
  { href: "/commission/revenue", label: "租金收入", icon: Banknote },
  { href: "/commission/external-profit", label: "外调利润", icon: WalletCards },
  { href: "/commission/deposits", label: "押金台账", icon: LockKeyhole },
  { href: "/commission/receivables", label: "应收账款", icon: FileSpreadsheet },
  { href: "/commission/vehicle-events", label: "车辆状态", icon: Car },
  { href: "/commission/target-adjustments", label: "指标调整", icon: Scale },
  { href: "/commission/settlements", label: "HR 试算", icon: Gauge },
  { href: "/commission/adjustments", label: "人工调整", icon: BadgeCheck },
  { href: "/commission/trial-run-checks", label: "试运行校验", icon: ListChecks },
  { href: "/commission/trial-runs", label: "试运行闭环", icon: ShieldCheck },
  { href: "/commission/approvals", label: "老板审批", icon: ClipboardCheck },
  { href: "/commission/exports", label: "奖金导出", icon: Download }
] as const;

const moduleContent = {
  periods: {
    title: "考核周期管理",
    subtitle: "周期从草稿、开启、财务锁定、HR 试算到老板审批和关闭。",
    owner: "老板 / HR",
    permission: "commission:period:manage",
    columns: ["考核周期", "部门", "起止日期", "周期状态", "备注"],
    rows: [
      ["2026-04", "租赁销售部", "2026-04-01 至 2026-04-30", "待老板审批", "财务已锁定，HR 已试算"],
      ["2026-05", "租赁销售部", "2026-05-01 至 2026-05-31", "开启中", "收入台账录入中"]
    ]
  },
  targets: {
    title: "收入指标管理",
    subtitle: "老板确认本期收入目标，审批后的指标调整才改变目标。",
    owner: "老板",
    permission: "commission:target:manage",
    columns: ["考核周期", "部门 / 车辆", "指标金额", "来源类型", "备注"],
    rows: [
      ["2026-04", "租赁销售部", "519,000.00", "手工确认", "老板确认目标"],
      ["2026-04", "车辆沪A-1001", "-3,000.00", "审批调整", "维修停运调整"]
    ]
  },
  rules: {
    title: "提成规则与发放规则",
    subtitle: "达成率落档后全额计提，分期规则区分本期应发和后续待发。",
    owner: "老板 / HR",
    permission: "commission:rule:manage",
    columns: ["达成率区间", "提成比例", "计提口径", "状态"],
    rows: [
      ["70%-80%", "3%", "全额计提", "启用"],
      ["80%-90%", "5%", "全额计提", "启用"],
      ["90%-100%", "7%", "全额计提", "启用"],
      ["100%以上", "10%", "全额计提", "启用"]
    ]
  },
  orders: {
    title: "订单台账",
    subtitle: "销售提交订单归属、车辆、客户和应收租金，财务不能修改订单归属。",
    owner: "销售 / 销售经理",
    permission: "commission:order:create",
    columns: ["订单号", "销售", "车辆来源", "应收租金 / 说明"],
    rows: [
      ["LCS-202604-A01", "销售 A", "自有车", "300,000.00"],
      ["LCS-202604-C01", "销售 C", "外调", "只登记利润回款"]
    ]
  },
  revenue: {
    title: "租金收入台账",
    subtitle: "仅记录进入公司账户的租金收入，审核通过且可计提后进入试算。",
    owner: "销售 / 财务",
    permission: "commission:revenue:review",
    columns: ["销售", "收款金额", "财务审核状态", "收入口径"],
    rows: [
      ["销售 A", "300,000.00", "APPROVED", "OWNED_RENT"],
      ["销售 B", "39,000.00", "APPROVED", "HISTORICAL_RECEIVABLE"]
    ]
  },
  "external-profit": {
    title: "外调利润回款台账",
    subtitle: "只登记销售打回公司的外调利润，不做完整收入成本核算。",
    owner: "销售 / 财务",
    permission: "commission:external-profit:review",
    columns: ["销售", "外调利润金额", "财务审核状态", "是否参与提成"],
    rows: [["销售 C", "80,000.00", "APPROVED", "参与提成"]]
  },
  deposits: {
    title: "押金台账",
    subtitle: "押金只登记收取、暂管人和退还状态，异常会提示 HR。",
    owner: "销售",
    permission: "commission:deposit:manage:self",
    columns: ["销售", "押金金额", "退还状态", "风险提示"],
    rows: [
      ["销售 A", "50,000.00", "HELD", "不参与提成"],
      ["销售 B", "30,000.00", "DISPUTED", "风险提示"]
    ]
  },
  receivables: {
    title: "应收账款",
    subtitle: "本阶段未收款订单不参与提成，保留部门应收阈值扩展点。",
    owner: "财务 / HR",
    permission: "commission:receivable:read",
    columns: ["订单 / 欠款来源", "应收金额", "应收状态", "提成处理"],
    rows: [
      ["LCS-202604-A02", "99,900.00", "OPEN", "不参与提成"],
      ["历史欠款回收", "39,000.00", "CLEARED", "计入本月"]
    ]
  },
  "vehicle-events": {
    title: "车辆状态流水",
    subtitle: "停运、维修、下线、上线只形成流水，不自动调整指标。",
    owner: "资管",
    permission: "commission:target-adjustment:request",
    columns: ["车牌号", "事件类型", "发生日期", "指标调整处理"],
    rows: [
      ["沪A-1001", "REPAIR", "2026-04-08", "已提交指标调整"],
      ["沪A-1002", "ONLINE", "2026-04-18", "无指标影响"]
    ]
  },
  "target-adjustments": {
    title: "指标调整申请",
    subtitle: "资管申请，老板审批，通过后才影响本期收入指标。",
    owner: "资管 / 老板",
    permission: "commission:target-adjustment:approve",
    columns: ["车辆", "原指标金额", "调整后指标金额", "审批状态"],
    rows: [
      ["沪A-1001", "519,000.00", "516,000.00", "PENDING"],
      ["沪A-1003", "20,000.00", "15,000.00", "APPROVED"]
    ]
  },
  approvals: {
    title: "老板审批",
    subtitle: "审批指标调整和最终提成表，审批动作写入日志。",
    owner: "老板",
    permission: "commission:settlement:approve",
    columns: ["审批对象类型", "审批对象", "审批动作", "操作角色"],
    rows: [
      ["SETTLEMENT_RUN", "2026-04-RUN-001", "SUBMIT", "HR"],
      ["TARGET_ADJUSTMENT", "沪A-1003", "APPROVE", "老板"]
    ]
  },
  exports: {
    title: "奖金发放导出记录",
    subtitle: "老板审批通过后才能导出正式 xlsx 发放表。",
    owner: "HR",
    permission: "commission:settlement:export",
    columns: ["结算批次", "导出格式", "导出人", "导出状态"],
    rows: [["2026-04-RUN-001", "XLSX", "HR", "待导出"]]
  }
} as const;

export type ModuleKey = keyof typeof moduleContent;

export function CommissionShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>租赁公司提成系统</strong>
          <span>LCS-P1-H01</span>
        </div>
        <nav className="nav-list" aria-label="提成系统模块">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link className="nav-item" href={item.href} key={item.href}>
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

export function ModulePage({ moduleKey }: { moduleKey: ModuleKey }) {
  const module = moduleContent[moduleKey];

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">{module.title}</h1>
          <p className="page-subtitle">{module.subtitle}</p>
        </div>
        <span className="badge blue">{module.owner}</span>
      </header>
      <section className="panel">
        <div className="panel-head">
          <h2>模块数据</h2>
          <span className="badge green">{module.permission}</span>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <thead>
              <tr>
                {module.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {module.rows.map((row) => (
                <tr key={row.join("-")}>
                  {module.columns.map((column, index) => (
                    <td key={`${column}-${row[index] ?? index}`}>{row[index] ?? "-"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
