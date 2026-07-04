# 租赁公司提成系统线下单机 V1 使用说明书

## 1. 启动

```powershell
cd /d D:\leasing-commission-system
pnpm seed:acceptance
pnpm dev
```

浏览器打开：

```text
http://localhost:3000/commission
```

页面顶部先选择本地试用角色。这个角色选择只用于单机试用，不是正式登录。

## 2. 基础资料

### HR / 管理员：员工档案

入口：`/commission/employees`

可操作：

- 新增员工
- 选择角色
- 设置是否参与提成
- 设置在职状态

员工会用于订单销售归属、财务审核人、老板审批人和 HR 试算人。

### 资管 / 管理员：车辆档案

入口：`/commission/vehicles`

可操作：

- 新增车辆
- 维护车牌、VIN、品牌、车型
- 区分自有车和外调车
- 设置车辆状态和月度目标金额

## 3. 周期、指标和规则

### 老板 / HR：考核周期

入口：`/commission/periods`

填写考核周期、部门、开始日期、结束日期和周期状态。

### 老板 / HR：收入指标

入口：`/commission/targets`

可录入部门指标，也可选择车辆录入车辆指标。考核期内车辆发生维修、停运、下线等情况时，不会自动调整指标；需要走指标调整申请。

### 老板 / 管理员：提成规则

入口：`/commission/rules`

当前可创建规则集。阶梯规则和分期规则的复杂维护后续继续增强，H08 重点保证 HR 试算读取真实数据库。

## 4. 销售录入

### 订单台账

入口：`/commission/orders`

销售选择账期、订单号、销售、客户、车辆、租赁日期和应收租金后保存。未收款订单只形成应收，不参与提成。

### 租金收入

入口：`/commission/revenue`

销售选择订单，填写收款金额、收款日期、公司账户、凭证链接和收入口径。财务审核通过前不参与提成。

### 外调利润回款

入口：`/commission/external-profit`

只填写销售打回公司的外调利润金额、打回公司日期、公司账户和凭证链接。不要录入外调收入和外调成本。

### 押金台账

入口：`/commission/deposits`

记录押金金额、暂管人、收取日期、退还金额、退还日期和退还状态。押金不进入收入，也不参与提成。

## 5. 财务审核

入口：`/commission/finance-review`

财务可对租金收入执行：

- 审核通过
- 驳回

外调利润页面也提供同样审核操作。审核通过后，收入或外调利润才会进入 HR 试算。

## 6. 资管与指标调整

### 车辆状态流水

入口：`/commission/vehicle-events`

资管登记维修、停运、下线、上线等事件。事件本身不自动改变收入指标。

### 指标调整申请

入口：`/commission/target-adjustments`

资管提交原指标金额、调整后指标金额和申请原因。老板审批通过后才影响 HR 试算目标。

## 7. 导入 Excel / CSV

入口：`/commission/imports`

流程：

1. 选择导入类型
2. 下载标准模板
3. 填写模板
4. 上传 xlsx 或 csv 文件
5. 查看预览结果
6. 有错误时修正文件后重新上传
7. 错误行为 0 时提交入库

提交后系统会写入 ImportBatch 和 ImportBatchRow，并能在对应台账页面看到数据。

## 8. HR 试算

入口：`/commission/settlements`

HR 选择账期，点击“生成真实试算”。系统会读取真实数据库中的目标、已审核收入、已审核外调利润、历史欠款回收、押金风险和人工调整，生成新的结算 run。

生成后可点击“提交老板审批”。如果有阻塞问题或未处理调整，页面会提示原因。

## 9. 老板审批

入口：`/commission/approvals`

老板查看 submitted run 后可以：

- 审批通过
- 填写原因后驳回

驳回不会删除历史 run。HR 修正数据后重新试算会生成新的 runNo。

## 10. 奖金导出

入口：`/commission/exports`

只有 approved run 可以导出。导出文件保存到：

```text
local-data/exports
```

导出记录会绑定 runId / runNo，后续不会覆盖历史记录。

## 11. 备份和恢复

备份：

```powershell
.\scripts\windows\backup-db.ps1
```

恢复：

```powershell
.\scripts\windows\restore-db.ps1 -BackupPath <备份文件路径>
```

重置验收数据会覆盖本地试用数据，执行前请先备份。

## 12. 常见问题

- 页面提示无权限：切换页面顶部的本地试用角色。
- `/api/health` 不通过：先执行 `pnpm seed:acceptance`，确认 `local-data/db/dev.db` 存在。
- 导入提示员工或车辆不存在：先在员工档案、车辆档案录入，或先导入基础资料。
- 不能导出：确认结算 run 已经老板审批通过。
