import type { OfflineResource } from "@/server/offline-v1-db";

export type FieldType = "text" | "date" | "money" | "select" | "textarea" | "checkbox";
export type ReferenceType = "employees" | "vehicles" | "periods" | "orders";

export interface OfflineFieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  reference?: ReferenceType;
  valueKey?: string;
  labelKey?: string;
  placeholder?: string;
  defaultValue?: string | boolean;
}

export interface OfflineCrudConfig {
  resource: OfflineResource;
  title: string;
  subtitle: string;
  owner: string;
  importType?: string;
  columns: Array<{ key: string; label: string; kind?: "money" | "boolean" | "date" }>;
  fields: OfflineFieldConfig[];
  reviewable?: "finance" | "target-adjustment";
}

const roleOptions = [
  { label: "老板", value: "BOSS" },
  { label: "管理员", value: "ADMIN" },
  { label: "销售", value: "SALES" },
  { label: "销售负责人", value: "SALES_MANAGER" },
  { label: "财务", value: "FINANCE" },
  { label: "资管", value: "ASSET_MANAGER" },
  { label: "HR", value: "HR" }
];

const yesNoOptions = [
  { label: "是", value: "true" },
  { label: "否", value: "false" }
];

const vehicleSourceOptions = [
  { label: "自有车", value: "OWNED" },
  { label: "外调车", value: "EXTERNAL" }
];

const financeStatusOptions = [
  { label: "待审核", value: "PENDING" },
  { label: "审核通过", value: "APPROVED" },
  { label: "已驳回", value: "REJECTED" }
];

export const offlineCrudConfigs: Record<OfflineResource, OfflineCrudConfig> = {
  employees: {
    resource: "employees",
    title: "员工档案",
    subtitle: "维护本地试用员工，供订单归属、审核人和审批人选择。",
    owner: "HR / 管理员",
    importType: "employees",
    columns: [
      { key: "name", label: "员工姓名" },
      { key: "departmentName", label: "部门" },
      { key: "role", label: "岗位角色" },
      { key: "isCommissionable", label: "参与提成", kind: "boolean" },
      { key: "employmentStatus", label: "在职状态" }
    ],
    fields: [
      { name: "name", label: "员工姓名", type: "text", required: true },
      { name: "departmentName", label: "部门", type: "text", required: true, defaultValue: "租赁销售部" },
      { name: "role", label: "岗位角色", type: "select", required: true, options: roleOptions, defaultValue: "SALES" },
      { name: "isCommissionable", label: "是否参与提成", type: "select", options: yesNoOptions, defaultValue: "true" },
      { name: "employmentStatus", label: "在职状态", type: "select", options: [{ label: "在职", value: "ACTIVE" }, { label: "离职", value: "INACTIVE" }], defaultValue: "ACTIVE" },
      { name: "remark", label: "备注", type: "textarea" }
    ]
  },
  vehicles: {
    resource: "vehicles",
    title: "车辆档案",
    subtitle: "维护车辆来源、状态和月度目标，订单台账会引用这里的车牌。",
    owner: "资管 / 管理员",
    importType: "vehicles",
    columns: [
      { key: "plateNo", label: "车牌号" },
      { key: "brand", label: "品牌" },
      { key: "model", label: "车型" },
      { key: "vehicleSourceType", label: "车辆来源" },
      { key: "status", label: "车辆状态" },
      { key: "monthlyTargetAmountCents", label: "月度目标金额", kind: "money" }
    ],
    fields: [
      { name: "plateNo", label: "车牌号", type: "text", required: true },
      { name: "vin", label: "VIN", type: "text" },
      { name: "brand", label: "品牌", type: "text", required: true },
      { name: "model", label: "车型", type: "text", required: true },
      { name: "vehicleSourceType", label: "车辆来源", type: "select", options: vehicleSourceOptions, defaultValue: "OWNED" },
      { name: "ownerType", label: "权属类型", type: "select", options: [{ label: "公司", value: "COMPANY" }, { label: "第三方", value: "THIRD_PARTY" }, { label: "个人", value: "PERSONAL" }], defaultValue: "COMPANY" },
      { name: "status", label: "车辆状态", type: "select", options: [{ label: "可用", value: "ACTIVE" }, { label: "维修", value: "REPAIR" }, { label: "停运", value: "STOPPED" }, { label: "下线", value: "OFFLINE" }], defaultValue: "ACTIVE" },
      { name: "monthlyTargetAmountCents", label: "月度目标金额（元）", type: "money" },
      { name: "remark", label: "备注", type: "textarea" }
    ]
  },
  periods: {
    resource: "periods",
    title: "考核周期",
    subtitle: "创建账期并控制后续录入、试算、审批和导出状态。",
    owner: "老板 / HR",
    columns: [
      { key: "periodCode", label: "考核周期" },
      { key: "departmentName", label: "部门" },
      { key: "startDate", label: "开始日期", kind: "date" },
      { key: "endDate", label: "结束日期", kind: "date" },
      { key: "status", label: "周期状态" }
    ],
    fields: [
      { name: "periodCode", label: "考核周期", type: "text", required: true, placeholder: "2026-05" },
      { name: "departmentName", label: "部门", type: "text", required: true, defaultValue: "租赁销售部" },
      { name: "startDate", label: "开始日期", type: "date", required: true },
      { name: "endDate", label: "结束日期", type: "date", required: true },
      { name: "status", label: "周期状态", type: "select", options: [{ label: "开启", value: "OPEN" }, { label: "草稿", value: "DRAFT" }], defaultValue: "OPEN" },
      { name: "remark", label: "备注", type: "textarea" }
    ]
  },
  targets: {
    resource: "targets",
    title: "收入指标",
    subtitle: "录入部门或车辆指标；审批通过的指标调整会在 HR 试算时影响目标。",
    owner: "老板 / HR",
    importType: "targets",
    columns: [
      { key: "periodCode", label: "考核周期" },
      { key: "departmentName", label: "部门" },
      { key: "plateNo", label: "车辆" },
      { key: "targetAmountCents", label: "指标金额", kind: "money" },
      { key: "sourceType", label: "指标来源" },
      { key: "isIncluded", label: "是否纳入", kind: "boolean" }
    ],
    fields: [
      { name: "periodCode", label: "考核周期", type: "select", reference: "periods", valueKey: "periodCode", labelKey: "periodCode", required: true },
      { name: "departmentName", label: "部门", type: "text", defaultValue: "租赁销售部" },
      { name: "vehicleId", label: "车辆（可不选）", type: "select", reference: "vehicles", valueKey: "id", labelKey: "plateNo" },
      { name: "targetAmountCents", label: "指标金额（元）", type: "money", required: true },
      { name: "sourceType", label: "指标来源", type: "select", options: [{ label: "手工", value: "MANUAL" }, { label: "邮件确认", value: "EMAIL_CONFIRMATION" }, { label: "调整", value: "ADJUSTED" }], defaultValue: "MANUAL" },
      { name: "isIncluded", label: "是否纳入", type: "select", options: yesNoOptions, defaultValue: "true" },
      { name: "remark", label: "备注", type: "textarea" }
    ]
  },
  rules: {
    resource: "rules",
    title: "提成规则",
    subtitle: "创建规则集；阶梯和发放明细当前仍以验收规则为主，后续继续细化编辑。",
    owner: "老板 / 管理员",
    columns: [
      { key: "name", label: "规则集名称" },
      { key: "departmentName", label: "部门" },
      { key: "effectiveFrom", label: "生效日期", kind: "date" },
      { key: "effectiveTo", label: "失效日期", kind: "date" },
      { key: "status", label: "状态" }
    ],
    fields: [
      { name: "name", label: "规则集名称", type: "text", required: true },
      { name: "departmentName", label: "部门", type: "text", defaultValue: "租赁销售部" },
      { name: "effectiveFrom", label: "生效日期", type: "date", required: true },
      { name: "effectiveTo", label: "失效日期", type: "date" },
      { name: "status", label: "状态", type: "select", options: [{ label: "启用", value: "ACTIVE" }, { label: "停用", value: "INACTIVE" }], defaultValue: "ACTIVE" }
    ]
  },
  orders: {
    resource: "orders",
    title: "订单台账",
    subtitle: "销售登记订单归属、客户、车辆和应收租金；未收款订单只形成应收，不参与提成。",
    owner: "销售",
    importType: "orders",
    columns: [
      { key: "periodCode", label: "考核周期" },
      { key: "orderNo", label: "订单号" },
      { key: "salesName", label: "销售" },
      { key: "customerName", label: "客户名称" },
      { key: "plateNo", label: "车辆" },
      { key: "receivableRentAmountCents", label: "应收租金", kind: "money" },
      { key: "orderStatus", label: "订单状态" }
    ],
    fields: [
      { name: "periodCode", label: "考核周期", type: "select", reference: "periods", valueKey: "periodCode", labelKey: "periodCode", required: true },
      { name: "departmentName", label: "部门", type: "text", defaultValue: "租赁销售部" },
      { name: "orderNo", label: "订单号", type: "text", required: true },
      { name: "salesUserId", label: "销售", type: "select", reference: "employees", valueKey: "id", labelKey: "name", required: true },
      { name: "customerName", label: "客户名称", type: "text", required: true },
      { name: "vehicleId", label: "车辆", type: "select", reference: "vehicles", valueKey: "id", labelKey: "plateNo", required: true },
      { name: "vehicleSourceType", label: "车辆来源", type: "select", options: vehicleSourceOptions, defaultValue: "OWNED" },
      { name: "billingMode", label: "计费方式", type: "select", options: [{ label: "月租", value: "MONTHLY" }, { label: "日租", value: "DAILY" }], defaultValue: "MONTHLY" },
      { name: "rentalStartDate", label: "租赁开始日期", type: "date", required: true },
      { name: "rentalEndDate", label: "租赁结束日期", type: "date", required: true },
      { name: "receivableRentAmountCents", label: "应收租金（元）", type: "money", required: true },
      { name: "orderStatus", label: "订单状态", type: "select", options: [{ label: "进行中", value: "ACTIVE" }, { label: "已完成", value: "COMPLETED" }, { label: "已取消", value: "CANCELLED" }], defaultValue: "ACTIVE" }
    ]
  },
  revenue: {
    resource: "revenue",
    title: "租金收入",
    subtitle: "销售提交进入公司账户的租金收入，财务审核通过后才参与提成。",
    owner: "销售 / 财务",
    importType: "revenue",
    reviewable: "finance",
    columns: [
      { key: "periodCode", label: "考核周期" },
      { key: "orderNo", label: "订单号" },
      { key: "salesName", label: "销售" },
      { key: "receiptAmountCents", label: "收款金额", kind: "money" },
      { key: "receiptDate", label: "收款日期", kind: "date" },
      { key: "financeReviewStatus", label: "财务审核状态" },
      { key: "isCommissionable", label: "参与提成", kind: "boolean" }
    ],
    fields: [
      { name: "orderId", label: "订单号", type: "select", reference: "orders", valueKey: "id", labelKey: "orderNo", required: true },
      { name: "receiptAmountCents", label: "收款金额（元）", type: "money", required: true },
      { name: "receiptDate", label: "收款日期", type: "date", required: true },
      { name: "companyAccount", label: "公司账户", type: "text", defaultValue: "本地试用账户" },
      { name: "receiptProofUrl", label: "凭证链接", type: "text" },
      { name: "financeReviewStatus", label: "财务审核状态", type: "select", options: financeStatusOptions, defaultValue: "PENDING" },
      { name: "isCommissionable", label: "是否参与提成", type: "select", options: yesNoOptions, defaultValue: "false" },
      { name: "revenueKind", label: "收入口径", type: "select", options: [{ label: "自有车租金", value: "OWNED_RENT" }, { label: "历史欠款本月回收", value: "HISTORICAL_RECEIVABLE" }], defaultValue: "OWNED_RENT" },
      { name: "remark", label: "备注", type: "textarea" }
    ]
  },
  "external-profit": {
    resource: "external-profit",
    title: "外调利润回款",
    subtitle: "只记录销售打回公司的外调利润，不记录外调收入和成本。",
    owner: "销售 / 财务",
    importType: "external-profit",
    reviewable: "finance",
    columns: [
      { key: "periodCode", label: "考核周期" },
      { key: "orderNo", label: "订单号" },
      { key: "salesName", label: "销售" },
      { key: "profitAmountCents", label: "外调利润金额", kind: "money" },
      { key: "remitDate", label: "打回公司日期", kind: "date" },
      { key: "financeReviewStatus", label: "财务审核状态" },
      { key: "isCommissionable", label: "参与提成", kind: "boolean" }
    ],
    fields: [
      { name: "orderId", label: "外调订单号", type: "select", reference: "orders", valueKey: "id", labelKey: "orderNo", required: true },
      { name: "profitAmountCents", label: "外调利润金额（元）", type: "money", required: true },
      { name: "remitDate", label: "打回公司日期", type: "date", required: true },
      { name: "companyAccount", label: "公司账户", type: "text", defaultValue: "本地试用账户" },
      { name: "receiptProofUrl", label: "凭证链接", type: "text" },
      { name: "financeReviewStatus", label: "财务审核状态", type: "select", options: financeStatusOptions, defaultValue: "PENDING" },
      { name: "isCommissionable", label: "是否参与提成", type: "select", options: yesNoOptions, defaultValue: "false" },
      { name: "remark", label: "备注", type: "textarea" }
    ]
  },
  deposits: {
    resource: "deposits",
    title: "押金台账",
    subtitle: "押金只记录收取、暂管和退还状态，不进入收入或提成。",
    owner: "销售",
    importType: "deposits",
    columns: [
      { key: "periodCode", label: "考核周期" },
      { key: "orderNo", label: "订单号" },
      { key: "salesName", label: "销售" },
      { key: "depositAmountCents", label: "押金金额", kind: "money" },
      { key: "holderName", label: "押金暂管人" },
      { key: "receivedDate", label: "收取日期", kind: "date" },
      { key: "refundStatus", label: "退还状态" }
    ],
    fields: [
      { name: "orderId", label: "订单号", type: "select", reference: "orders", valueKey: "id", labelKey: "orderNo", required: true },
      { name: "depositAmountCents", label: "押金金额（元）", type: "money", required: true },
      { name: "holderUserId", label: "押金暂管人", type: "select", reference: "employees", valueKey: "id", labelKey: "name", required: true },
      { name: "receivedDate", label: "收取日期", type: "date", required: true },
      { name: "refundAmountCents", label: "退还金额（元）", type: "money" },
      { name: "refundDate", label: "退还日期", type: "date" },
      { name: "refundStatus", label: "退还状态", type: "select", options: [{ label: "暂未退还", value: "HELD" }, { label: "部分退还", value: "PARTIALLY_REFUNDED" }, { label: "已退还", value: "REFUNDED" }, { label: "争议", value: "DISPUTED" }], defaultValue: "HELD" },
      { name: "remark", label: "备注", type: "textarea" }
    ]
  },
  "vehicle-events": {
    resource: "vehicle-events",
    title: "车辆状态流水",
    subtitle: "资管登记车辆状态变化；状态事件本身不会自动调整指标。",
    owner: "资管",
    importType: "vehicle-events",
    columns: [
      { key: "periodCode", label: "考核周期" },
      { key: "plateNo", label: "车辆" },
      { key: "eventType", label: "事件类型" },
      { key: "startDate", label: "开始日期", kind: "date" },
      { key: "endDate", label: "结束日期", kind: "date" },
      { key: "reason", label: "原因" }
    ],
    fields: [
      { name: "vehicleId", label: "车辆", type: "select", reference: "vehicles", valueKey: "id", labelKey: "plateNo", required: true },
      { name: "periodCode", label: "考核周期", type: "select", reference: "periods", valueKey: "periodCode", labelKey: "periodCode" },
      { name: "eventType", label: "事件类型", type: "select", options: [{ label: "维修", value: "REPAIR" }, { label: "停运", value: "STOPPED" }, { label: "下线", value: "OFFLINE" }, { label: "上线", value: "ONLINE" }, { label: "其他", value: "OTHER" }], defaultValue: "REPAIR" },
      { name: "startDate", label: "开始日期", type: "date", required: true },
      { name: "endDate", label: "结束日期", type: "date" },
      { name: "reason", label: "原因", type: "textarea", required: true }
    ]
  },
  "target-adjustments": {
    resource: "target-adjustments",
    title: "指标调整申请",
    subtitle: "资管提交申请，老板审批通过后才影响 HR 试算目标。",
    owner: "资管 / 老板",
    reviewable: "target-adjustment",
    columns: [
      { key: "periodCode", label: "考核周期" },
      { key: "plateNo", label: "车辆" },
      { key: "reasonType", label: "原因类型" },
      { key: "originalTargetAmountCents", label: "原指标金额", kind: "money" },
      { key: "adjustedTargetAmountCents", label: "调整后指标金额", kind: "money" },
      { key: "status", label: "审批状态" },
      { key: "approvalRemark", label: "审批意见" }
    ],
    fields: [
      { name: "periodCode", label: "考核周期", type: "select", reference: "periods", valueKey: "periodCode", labelKey: "periodCode", required: true },
      { name: "vehicleId", label: "车辆", type: "select", reference: "vehicles", valueKey: "id", labelKey: "plateNo", required: true },
      { name: "reasonType", label: "原因类型", type: "select", options: [{ label: "维修", value: "REPAIR" }, { label: "停运", value: "STOPPED" }, { label: "下线", value: "OFFLINE" }, { label: "其他", value: "OTHER" }], defaultValue: "REPAIR" },
      { name: "originalTargetAmountCents", label: "原指标金额（元）", type: "money", required: true },
      { name: "adjustedTargetAmountCents", label: "调整后指标金额（元）", type: "money", required: true },
      { name: "reason", label: "申请原因", type: "textarea", required: true }
    ]
  },
  "import-batches": {
    resource: "import-batches",
    title: "导入批次",
    subtitle: "查看通过导入中心提交的批次和状态。",
    owner: "HR / 管理员",
    columns: [
      { key: "importType", label: "导入类型" },
      { key: "fileName", label: "文件名" },
      { key: "status", label: "状态" },
      { key: "totalRows", label: "总行数" },
      { key: "validRows", label: "有效行数" },
      { key: "errorRows", label: "错误行数" },
      { key: "committedAt", label: "提交时间", kind: "date" }
    ],
    fields: []
  }
};

export function getOfflineCrudConfig(resource: OfflineResource): OfflineCrudConfig {
  return offlineCrudConfigs[resource];
}
