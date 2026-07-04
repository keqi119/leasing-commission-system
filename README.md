# 租赁公司提成系统

本项目是汽车经营性租赁小团队使用的销售提成结算 MVP，支持订单、租金收入、外调利润、押金、车辆状态、指标调整、HR 试算、老板审批和奖金发放导出。

## 项目定位

- 提成公式集中在 `packages/commission-engine`。
- 前端页面不散落业务公式。
- API 和页面通过服务层调用计算引擎。
- 每次结算生成快照。
- 老板审批后的结算结果不可直接覆盖。

## 固定工作区

本地开发和试用固定使用：

```text
D:\leasing-commission-system
```

真实业务数据、导入文件、导出文件和备份文件放在：

```text
local-data/
```

`local-data/` 不提交到 Git。

## 本地快速启动

```powershell
cd /d D:\leasing-commission-system
pnpm install
pnpm seed:acceptance
pnpm dev
```

打开：

```text
http://localhost:3000/commission
```

## Windows 单机试用

推荐非开发人员使用以下脚本：

```powershell
cd /d D:\leasing-commission-system
.\scripts\windows\setup-local.ps1
.\scripts\windows\reset-acceptance-db.ps1
.\scripts\windows\start-local.ps1
```

健康检查：

```powershell
.\scripts\windows\smoke-local.ps1
```

备份数据库：

```powershell
.\scripts\windows\backup-db.ps1
```

恢复数据库：

```powershell
.\scripts\windows\restore-db.ps1 -BackupPath .\local-data\backups\dev-20260704-153000.db
```

完整中文说明书见：

```text
docs/operations/windows-local-trial-guide.md
```

## 线下单机 V1 真实操作入口

H08 起，以下页面提供真实写库或真实流程动作：

- `/commission/employees`：员工档案
- `/commission/vehicles`：车辆档案
- `/commission/periods`：考核周期
- `/commission/targets`：收入指标
- `/commission/rules`：提成规则集
- `/commission/orders`：订单台账
- `/commission/revenue`：租金收入
- `/commission/external-profit`：外调利润回款
- `/commission/deposits`：押金台账
- `/commission/vehicle-events`：车辆状态流水
- `/commission/target-adjustments`：指标调整申请
- 各业务台账页面底部：Excel / CSV 导入、模板下载和填写帮助
- `/commission/finance-review`：财务审核入口
- `/commission/settlements`：HR 真实试算和提交审批
- `/commission/approvals`：老板审批或驳回
- `/commission/exports`：approved run 正式导出

页面顶部可切换本地试用角色。该能力只用于 Windows 单机试用，不是正式登录认证。

中文线下 V1 使用说明书：

```text
docs/operations/offline-v1-user-guide.md
```

## 常用命令

```powershell
pnpm check:project-isolation
pnpm seed:acceptance
pnpm seed:real-period
pnpm test
pnpm typecheck
pnpm prisma:validate
pnpm build
pnpm package:local
```

## 本地试用包

生成试用包：

```powershell
pnpm package:local
```

输出位置：

```text
release/local-trial/
release/leasing-commission-system-local-trial.zip
```

试用包不会包含：

- `node_modules/`
- `.next/`
- `.git/`
- `local-data/`
- `dev.db`
- 真实导入文件
- 真实导出文件
- 备份文件

## 数据安全提示

- 不要提交 `.env`。
- 不要提交 `local-data/`。
- 不要提交 `.db`、`.sqlite`、`.backup` 文件。
- 真实客户名称、手机号、身份证、银行卡号不得进入仓库。
- 试运行数据应先脱敏。

## 技术栈

- pnpm monorepo
- Next.js App Router
- Prisma schema
- SQLite / sql.js 本地 MVP 数据库
- Vitest
- ExcelJS

## 远端仓库

GitHub: <https://github.com/keqi119/leasing-commission-system>
