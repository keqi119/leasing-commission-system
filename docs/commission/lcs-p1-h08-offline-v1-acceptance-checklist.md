# LCS-P1-H08 线下单机 V1 验收清单

## 环境

- 工作区：`D:\leasing-commission-system`
- 数据库：`local-data/db/dev.db`
- 启动命令：`pnpm dev`
- 访问入口：`http://localhost:3000/commission`

## 验收项

| 项目 | 期望结果 | 状态 |
| --- | --- | --- |
| `/api/health` | seed 后返回 `ok: true` | 待验收 |
| 本地角色选择 | 页面顶部可切换老板、销售、财务、资管、HR | 待验收 |
| 员工档案 | 可新增，刷新后仍存在 | 待验收 |
| 车辆档案 | 可新增，订单可选择车辆 | 待验收 |
| 考核周期 | 可新增账期 | 待验收 |
| 收入指标 | 可录入并参与试算目标 | 待验收 |
| 订单台账 | 可新增订单并在列表展示 | 待验收 |
| 租金收入 | 可提交，财务可审核 | 待验收 |
| 外调利润 | 只录入利润回款，财务可审核 | 待验收 |
| 押金台账 | 可录入，不参与收入和提成 | 待验收 |
| 车辆状态 | 可登记，不自动调整指标 | 待验收 |
| 指标调整 | 资管提交，老板审批通过后影响目标 | 待验收 |
| 导入中心 | xlsx/csv 上传、预览、错误提示、提交落库 | 待验收 |
| HR 试算 | 生成真实 CommissionSettlementRun / Line | 待验收 |
| 老板审批 | 可审批或驳回 submitted run | 待验收 |
| 奖金导出 | 仅 approved run 可导出，并写入 export record | 待验收 |
| 备份恢复 | Windows 脚本备份和恢复同一个 dev.db | 待验收 |

## 回归命令

```powershell
pnpm check:project-isolation
pnpm seed:acceptance
pnpm test
pnpm typecheck
pnpm prisma:validate
pnpm build
pnpm package:local
```
