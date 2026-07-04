# LCS-P1 当前功能能力边界审计

审计日期：2026-07-04
审计人：Codex
审计项目目录：D:\leasing-commission-system
审计基线：main@27c7b90（Merge pull request #8 from keqi119/feature/lcs-p1-h07-local-trial-package）
远端仓库：https://github.com/keqi119/leasing-commission-system.git

## 1. 基线确认

本次实际审计的是 `main@27c7b90`。

审计开始时发现本地还存在未合并分支：

| ref | commit | 审计处理 |
| --- | --- | --- |
| main | 27c7b90 | 本次审计基线 |
| feature/lcs-p1-h07-local-trial-package | 244e4a3 | 已通过 PR 合入 main，不单独计算能力 |
| feature/lcs-p1-h07-import-upload-workflow | 15b4431 | 未合入 main，本次不把该分支能力计入 main |

工作区检查结果：`git status --short` 为空。

## 2. 执行命令结果

| 命令 | 结果 | 备注 |
| --- | --- | --- |
| `git status` | 通过 | 工作区干净 |
| `git branch --show-current` | `main` | 审计前已切回 main |
| `git log -1 --oneline` | `27c7b90 ...` | H07 merge commit |
| `git remote -v` | origin 指向 GitHub 仓库 | 正常 |
| `pnpm check:project-isolation` | 通过 | 未发现隔离违规 |
| `pnpm seed:acceptance` | 通过 | 写入 `packages/database/prisma/dev.db` |
| `pnpm test` | 通过 | 18 个测试文件，59 个测试 |
| `pnpm typecheck` | 通过 | 无类型错误 |
| `pnpm prisma:validate` | 通过 | Prisma schema 有效 |
| `pnpm build` | 通过 | 有 Turbopack NFT warning，但构建成功 |
| `pnpm package:local` | 通过 | 生成 `release/local-trial` 和 zip |
| `GET /api/health` | 503 | health 默认检查 `local-data/db/dev.db`，但 seed 写入另一位置 |
| 页面烟测 | 200 | `/commission` 等页面可返回 HTML |

结论：技术测试和构建通过，但不能直接推导为业务闭环可用。

## 3. 总体结论

当前系统不能支持完整真实线下单机 V1 验收：NO。

更准确地说：当前 main 已具备计算引擎、部分 DB workflow API、页面展示、模板下载、本地打包脚本和一批测试；但业务人员不能仅通过页面完成真实录入、审核、试算、审批、导出闭环。大量页面仍是只读展示或流程说明，核心台账导入在 main 上仍是 JSON API + 内存上下文，不是 Excel 文件上传并持久化到台账数据库。

## 4. 已真实实现能力

| 能力 | 当前状态 | 证据 |
| --- | --- | --- |
| 提成计算纯函数 | WORKING | `packages/commission-engine/src/index.ts`，验收和金标准测试通过 |
| H02 2026-04 验收种子 | WORKING | `packages/database/prisma/seed.acceptance.ts`；`pnpm seed:acceptance` 成功 |
| Prisma schema 覆盖核心模型 | WORKING | `packages/database/prisma/schema.prisma:250-646` |
| TrialRun / Issue / Adjustment / Settlement 部分 DB workflow | PARTIAL | `apps/web/src/server/trial-run-db-workflow.ts:265` 等函数 |
| 结算 run 审批、驳回、重算、导出 API | PARTIAL | `apps/web/src/app/api/commission/settlements/*`，`exports/[settlementRunId]` |
| 本地单机包脚本 | PARTIAL | `scripts/create-local-trial-package.ts` 成功生成 release 包 |
| 备份/恢复脚本 | PARTIAL | `scripts/windows/backup-db.ps1`，`restore-db.ps1` |
| 健康检查 API | PARTIAL | `/api/health` 存在，但当前返回 503 |

## 5. Demo / sample / fixture 能力

| 能力 | 当前状态 | 证据 | 风险 |
| --- | --- | --- | --- |
| 订单、收入、外调、押金页面 | DEMO_ONLY | `apps/web/src/components/EntryLedgerPage.tsx:59` 使用 `createDefaultImportContext()` | 页面不读取真实 DB 台账 |
| 周期、目标、规则、应收、车辆状态、指标调整页面 | DEMO_ONLY | `apps/web/src/components/CommissionShell.tsx` 内 `moduleContent` 静态 rows | 看起来像业务页面，实际不可录入 |
| `/commission/imports` | DEMO_ONLY/PARTIAL | 仅模板下载链接：`imports/page.tsx:29-32` | main 上无文件上传预览提交 UI |
| `POST /api/commission/settlements/calculate` | PARTIAL | `settlements/calculate/route.ts:7,26` fallback 到 `acceptanceScenarioInput` | 未传完整 body 时使用样例输入 |
| 导出 API fallback | PARTIAL | `exports/[settlementRunId]/route.ts:7,40` fallback 到 `acceptanceScenarioSettlement` | 非 DB run 也可能生成样例导出 |
| H05 2026-05 数据 | FIXTURE | `trial-run-db-workflow.ts` 含 `seedRealPeriodFixtureForTest` | 是脱敏 fixture，不是真实导入工作流 |

## 6. API 有但页面入口不足

| API 能力 | 是否写库 | 页面入口 | 当前判断 |
| --- | --- | --- | --- |
| `POST /api/commission/trial-runs` | 是 | `/commission/trial-runs/new` 只显示 API payload | API 有，页面无表单 |
| `POST /api/commission/trial-runs/[id]/issues` | 是 | 详情页无创建 issue 表单 | API 有，页面无操作入口 |
| `PATCH /api/commission/settlements/[runId]/submit` | 是 | 结算页只展示状态和 diff 链接 | API 有，页面无提交按钮 |
| `PATCH /api/commission/settlements/[runId]/approve/reject` | 是 | 审批页无批准/驳回表单 | API 有，页面无审批动作 |
| `POST /api/commission/settlements/[runId]/recalculate` | 是 | 页面无重算按钮 | API 有，页面无动作 |
| `POST /api/commission/adjustments` | 是 | 调整页只读列表 | API 有，页面无创建表单 |
| `PATCH /api/commission/adjustments/[id]/approve/reject` | 是 | 调整页无审批动作 | API 有，页面无动作 |
| `POST /api/commission/exports/[settlementRunId]` | 是/生成文件 | 导出页无导出按钮 | API 有，页面无正式导出入口 |
| `POST /api/commission/imports/preview/commit` | 内存上下文 | 导入页无上传 UI | API 有，页面未接 |

## 7. 页面有但没有真实提交 / 落库能力

| 页面 | 当前能力 | 缺口 | 证据 |
| --- | --- | --- | --- |
| `/commission/imports` | 模板下载 | 无 Excel/CSV 文件上传、预览、提交 UI | `imports/page.tsx:29-32` |
| `/commission/orders` | 展示 seed/import context | 无新增订单表单，无编辑、提交、作废 | `EntryLedgerPage.tsx:59` |
| `/commission/revenue` | 展示 seed/import context | 无提交租金收入，无财务审核按钮 | `EntryLedgerPage.tsx` |
| `/commission/external-profit` | 展示 seed/import context | 无提交外调利润，无财务审核按钮 | `EntryLedgerPage.tsx` |
| `/commission/deposits` | 展示 seed/import context | 无押金登记、退还状态更新 | `EntryLedgerPage.tsx` |
| `/commission/periods` | 静态表格 | 无创建/开启/锁定周期 | `CommissionShell.tsx` |
| `/commission/targets` | 静态表格 | 无录入/确认/调整指标入口 | `CommissionShell.tsx` |
| `/commission/vehicle-events` | 静态表格 | 无登记车辆状态流水 | `CommissionShell.tsx` |
| `/commission/target-adjustments` | 静态表格 | 无资管申请、老板审批表单 | `CommissionShell.tsx` |
| `/commission/trial-runs/new` | 显示如何调用 API | 无真实创建表单 | `trial-runs/new/page.tsx:14,30` |
| `/commission/approvals` | 审批队列展示 | 无审批/驳回动作 | `approvals/page.tsx:91` 只有 diff 链接 |
| `/commission/exports` | 导出记录展示 | 无正式导出按钮 | 页面只显示列表和状态 |

## 8. 有落库能力但闭环不完整

| 对象 | 落库能力 | 闭环缺口 |
| --- | --- | --- |
| TrialRun | API 和 DB workflow 可创建 | 页面不能创建，不能直接处理问题 |
| TrialRunIssue | API 可创建/更新/解决 | 页面没有问题创建、筛选、快速处理表单 |
| CommissionAdjustment | API 可创建/提交/审批/驳回 | 页面只读，无申请/提交/审批入口 |
| CommissionSettlementRun | API 可计算/提交/审批/驳回/重算 | 页面不提供操作按钮；计算来源仍主要来自 fixture/DB workflow，不是用户完整录入台账 |
| CommissionExportRecord | API 可绑定 approved run | 页面无导出动作；导出 API 有 sample fallback |
| PeriodReopenRequest | API 可创建/审批 | 页面仅有 reopen 页面骨架，闭环不足 |

## 9. 角色流程审计

| 角色 | 流程 | 状态 | 说明 |
| --- | --- | --- | --- |
| 老板/管理员 | 创建周期 | DEMO_ONLY | 页面静态，无表单 |
| 老板/管理员 | 录入/确认收入指标 | DEMO_ONLY | 目标页面静态；通用 API 不等于业务流程 |
| 老板/管理员 | 配置提成阶梯/发放规则 | DEMO_ONLY | 规则页面静态 |
| 老板/管理员 | 审批指标调整 | DEMO_ONLY/PARTIAL | 模型/API 有基础表，但页面没有审批动作 |
| 老板/管理员 | 审批人工调整 | PARTIAL | API 可审批；页面无按钮 |
| 老板/管理员 | 审批/驳回 settlement run | PARTIAL | API 可 PATCH；审批页只读 |
| 老板/管理员 | 查看重算差异 | PARTIAL | diff 页面可读 |
| 老板/管理员 | 锁定/重开周期 | PARTIAL | API/页面骨架存在，实际业务入口不足 |
| 销售 | 新增/修改本人订单 | MISSING | 无新增/编辑 UI |
| 销售 | 登记租金收入/押金/外调利润 | MISSING | 台账页面只读，导入页无上传 UI |
| 销售 | 查看本人贡献和提成 | PARTIAL | 结算明细可展示，但无真实用户隔离 |
| 销售 | 处理本人 issue | MISSING | 无页面操作入口 |
| 销售 | 只能看本人数据 | MISSING | 当前仅 header 角色模拟，无真实会话/数据过滤闭环 |
| 财务 | 查看/审核租金收入 | MISSING | 无财务审核工作台和动作按钮 |
| 财务 | 审核外调利润 | MISSING | 无审核入口 |
| 财务 | 确认应收/锁定财务数据 | MISSING/PARTIAL | 模型/展示有，应收和锁定流程不可操作 |
| 财务 | 处理财务 issue | MISSING | 无 issue 操作入口 |
| 资管 | 登记车辆状态变化 | DEMO_ONLY | 车辆状态页静态 |
| 资管 | 提交指标调整申请 | DEMO_ONLY/PARTIAL | 无表单 |
| 资管 | 处理车辆/指标 issue | MISSING | 无页面操作入口 |
| HR | 创建 trial run | PARTIAL | API 可创建；页面只显示 API 说明 |
| HR | 发起试算 | PARTIAL | API 可计算/重算；页面无按钮 |
| HR | 数据检查问题 | PARTIAL | 页面可展示 DB check report |
| HR | 阻止 BLOCKER 提审 | PARTIAL | 服务层有测试；页面只提示 |
| HR | 人工调整状态 | PARTIAL | 页面只读可见 |
| HR | 驳回后重算 | PARTIAL | API 可重算；页面无动作 |
| HR | 基于 approved run 导出 | PARTIAL | API 可导出；页面无按钮 |
| HR | 生成试运行报告 | PARTIAL | API 可生成；页面入口不足 |

## 10. 数据入口审计

| 数据对象 | 手工录入页面 | 导入模板 | 预览校验 | 提交入库 | 列表查看 | 修改 | 审核 | 删除/作废 | 是否参与计算 | 当前状态 | 证据路径 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 员工档案 | 无 | 有 | JSON API 简单校验 | 否，commit 不 append | 无真实页面 | 无 | 无 | 无 | 间接 | MISSING | `imports.ts:927,943` |
| 车辆档案 | 无 | 有 | JSON API 简单校验 | 否，commit 不 append | 无真实页面 | 无 | 无 | 无 | 间接 | MISSING | `imports.ts:927,943` |
| 考核周期 | 静态展示 | 否 | 否 | 通用 API 可裸写 | 静态页/通用 GET | 无 | 无 | 无 | 是 | DEMO_ONLY/PARTIAL | `CommissionShell.tsx`，`[resource]/route.ts` |
| 收入指标 | 静态展示 | 有 | JSON API 简单校验 | 否，commit 不 append | 静态页 | 无 | 无 | 无 | 是 | DEMO_ONLY | `imports.ts:943` |
| 提成规则 | 静态展示 | 否 | 否 | 通用 API 仅规则集 | 静态页 | 无 | 无 | 无 | 是 | DEMO_ONLY | `CommissionShell.tsx` |
| 分期发放规则 | 静态展示 | 否 | 否 | 无完整入口 | 静态页 | 无 | 无 | 无 | 是 | DEMO_ONLY | `CommissionShell.tsx` |
| 订单台账 | 无 | 有 | 有 | 内存 context，不是 DB | 页面读默认 context | 无 | 无 | 无 | 间接 | PARTIAL/DEMO_ONLY | `EntryLedgerPage.tsx:59`，`imports.ts:943` |
| 租金收入 | 无 | 有 | 有 | 内存 context，不是 DB | 页面读默认 context | 无 | 无财务审核 | 无 | 是 | PARTIAL/DEMO_ONLY | `imports.ts:556` |
| 外调利润回款 | 无 | 有 | 有 | 内存 context，不是 DB | 页面读默认 context | 无 | 无财务审核 | 无 | 是 | PARTIAL/DEMO_ONLY | `imports.ts:556` |
| 押金台账 | 无 | 有 | 有 | 内存 context，不是 DB | 页面读默认 context | 无 | 无 | 无 | 不参与 | PARTIAL/DEMO_ONLY | `imports.ts:943` |
| 应收账款 | 静态展示 | 否 | 否 | 无完整入口 | 静态页 | 无 | 无 | 无 | 不参与未收款 | DEMO_ONLY | `CommissionShell.tsx` |
| 车辆状态流水 | 静态展示 | 有 | JSON API 简单校验 | 否，commit 不 append | 静态页 | 无 | 无 | 无 | 不自动影响 | DEMO_ONLY | `imports.ts:943` |
| 指标调整申请 | 静态展示 | 否 | 否 | 通用 API 可裸写 | 静态页 | 无 | 无页面审批 | 无 | 审批后应影响 | PARTIAL/DEMO_ONLY | `[resource]/route.ts` |
| 人工调整 | 无创建页 | 否 | API 校验 | 是 | 调整页读 DB | 无 | API 有，页面无 | 无 | 审批后影响新 run | PARTIAL | `adjustments/route.ts` |
| Trial Run | 新建页仅说明 API | 否 | API 校验 | 是 | 页面读 DB | 无 | 不适用 | 无 | 间接 | PARTIAL | `trial-runs/route.ts` |
| Trial Run Issue | 无创建处理页 | 否 | API 校验 | 是 | 详情页可读 | API 可更新 | 不适用 | 无 | BLOCKER 阻断 | PARTIAL | `trial-runs/[id]/issues` |
| Settlement Run | 无试算按钮 | 否 | API 校验 | 是 | 页面读 DB | 重算 API | API 审批 | 不覆盖历史 | 是 | PARTIAL | `settlements/*` |
| Export Record | 无导出按钮 | 否 | API 校验 | 是 | 页面读 DB | 无 | approved run 限制 | 无 | 不适用 | PARTIAL | `exports/[settlementRunId]` |

## 11. API 审计清单

| API | Method | 用途 | 需要角色 | 真实写库 | 页面调用 | 测试 | 当前状态 | 证据 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/health` | GET | 本地健康检查 | 否 | 否 | 可直接访问 | 有 | PARTIAL | 当前返回 503 |
| `/api/commission/imports/templates` | GET | 下载模板 | 否/宽松 | 否 | 页面链接调用 | 有 | WORKING | `imports/page.tsx:29-32` |
| `/api/commission/imports/preview` | POST | JSON rows 预览 | header role | 否 | main 页面未调用 | 有 | PARTIAL | `preview/route.ts` |
| `/api/commission/imports/commit` | POST | 提交预览 | header role | 否，写内存 context | main 页面未调用 | 有 | PARTIAL | `commit/route.ts` |
| `/api/commission/imports/batches` | GET | 导入批次 | header role | 否，读内存数组 | 无页面入口 | 有 | PARTIAL | `localImportBatches` |
| `/api/commission/[resource]` | GET/POST | 通用资源读写 | header role | 是，裸 SQL | 业务页面未系统调用 | 少量 | PARTIAL/RISKY | `[resource]/route.ts:125` |
| `/api/commission/trial-runs` | GET/POST | Trial Run 列表/创建 | header role | 是 | 列表读；新建页不提交 | 有 | PARTIAL | `trial-runs/route.ts` |
| `/api/commission/trial-runs/[id]/issues` | POST/PATCH | Issue 创建/处理 | header role | 是 | 无页面动作 | 有 | PARTIAL | `issues/route.ts` |
| `/api/commission/adjustments` | GET/POST/PATCH | 人工调整 | header role | 是 | 页面只读 | 有 | PARTIAL | `adjustments/route.ts` |
| `/api/commission/settlements/calculate` | POST | 计算快照 | header role | 否 | 无页面动作 | 有 | PARTIAL/SAMPLE | fallback 样例输入 |
| `/api/commission/settlements/[runId]/*` | PATCH/POST/GET | 提交、审批、驳回、重算、diff | header role | 是 | 页面只读/只链接 diff | 有 | PARTIAL | `settlements/*` |
| `/api/commission/exports/[settlementRunId]` | POST | 导出 xlsx | header role | 是，DB run 时写 export record | 页面无按钮 | 有 | PARTIAL | 有 sample fallback |
| `/api/commission/periods/[periodId]/reopen-requests` | POST/PATCH | 重开申请/审批 | header role | 是 | 页面入口不足 | 有 | PARTIAL | `periods/*/reopen-requests` |

## 12. 持久化审计

| 业务对象 | Prisma 模型 | DB 写入 | DB 读取 | 页面读 DB | 测试覆盖 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| ImportBatch | 有 | seed/fixture/raw 可写；main import commit 不写 DB | DB workflow 可读 committed batches | trial-run-checks 间接读 DB batches | 部分 | 导入 API 的 batch 是内存数组 |
| ImportBatchRow | 有 | fixture/raw 可写 | 部分 | 无直接页面 | 部分 | 不等于真实 Excel 导入落库 |
| TrialRun | 有 | 是 | 是 | 是 | 有 | 页面无法创建 |
| TrialRunIssue | 有 | 是 | 是 | 详情页可读 | 有 | 页面无法创建/处理 |
| TrialRunReport | 有 | 是 | 是 | 详情页/报告入口有限 | 有 | API 可生成 |
| CommissionAdjustment | 有 | 是 | 是 | 是 | 有 | 页面只读 |
| PeriodReopenRequest | 有 | 是 | 部分 | 页面骨架 | 有 | 闭环不足 |
| CommissionSettlementRun | 有 | 是 | 是 | 是 | 有 | 真实业务输入链路不足 |
| CommissionSettlementLine | 有 | 是 | 是 | 是 | 有 | 来自 DB workflow 计算 |
| CommissionExportRecord | 有 | 是 | 是 | 是 | 有 | 页面无导出按钮 |
| LeaseOrderLedger | 有 | seed/generic API 可写 | generic API/DB workflow 可读 | 主台账页不读 DB | 部分 | 页面读默认 context |
| RevenueReceiptLedger | 有 | seed/generic API 可写 | DB workflow 可读 | 主台账页不读 DB | 部分 | 财务审核缺入口 |
| ExternalProfitReceipt | 有 | seed/generic API 可写 | DB workflow 可读 | 主台账页不读 DB | 部分 | 财务审核缺入口 |
| DepositLedger | 有 | seed/generic API 可写 | DB workflow 可读 | 主台账页不读 DB | 部分 | 押金更新缺入口 |
| VehicleStatusEvent | 有 | seed/generic API 可写 | DB workflow 可读 | 页面静态 | 部分 | 无状态流水录入页 |
| TargetAdjustmentRequest | 有 | seed/generic API 可写 | DB workflow 可读 | 页面静态 | 部分 | 审批闭环不足 |

## 13. 当前前三大阻塞问题

1. 数据入口没有真实打通：main 上无 Excel/CSV 上传页面，导入 API 写内存 context，不写 DB；员工、车辆、目标、车辆状态模板即使预览也不会进入可计算台账。
2. 业务页面缺少操作闭环：销售录入、财务审核、资管申请、老板审批、HR 试算/导出大多只有展示或 API，没有页面按钮和表单。
3. 本地运行数据路径和认证机制不达标：health 检查 `local-data/db/dev.db`，seed 写 `packages/database/prisma/dev.db`；角色权限依赖请求头模拟，无真实登录/会话/用户隔离。

## 14. 结论

当前系统适合继续作为“计算规则 + DB workflow 原型 + 本地包脚手架”的技术基线，但不适合直接交给业务人员做完整线下单机验收。下一阶段应暂停扩展演示功能，优先补齐真实录入/导入入口、台账 CRUD、财务审核工作台、HR 试算入口和老板审批闭环。
