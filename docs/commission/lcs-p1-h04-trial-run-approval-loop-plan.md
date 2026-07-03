# LCS-P1-H04 真实账期试运行与审批闭环计划

## 目标

本阶段围绕真实账期试运行补齐闭环：

导入 / 录入真实账期数据 -> 财务审核 -> HR 试算 -> 老板驳回 -> 修正数据 -> 重算 -> 差异说明 -> 老板审批 -> HR 绑定 approved run 导出 -> 留存试运行报告。

## 实现范围

- 新增试运行服务层 `trial-run-workflow`，管理 run 版本、驳回、重算、差异、人工调整、重开、导出绑定和报告。
- 新增 Prisma 模型：`TrialRun`、`TrialRunIssue`、`TrialRunReport`、`CommissionAdjustment`、`PeriodReopenRequest`。
- 新增页面：`/commission/trial-runs`、`/commission/trial-runs/[id]`、`/commission/settlements/[runId]/diff`。
- 优化页面：`/commission/settlements`、`/commission/approvals`、`/commission/exports`、`/commission/trial-run-checks`。
- 新增测试目录：`tests/approval-loop`、`tests/adjustments`、`tests/trial-runs`。

## 核心规则

- 被驳回的 run 不删除，不覆盖。
- 每次重算生成新的 `runNo`。
- rejected run 禁止导出正式发放表。
- approved / exported run 才能导出正式发放表。
- 人工调整不修改原始收入台账。
- 人工调整必须审批后才进入新 run。
- 审批通过后周期锁定，影响结算的数据禁止直接导入或修改。
- 重开周期必须留原因，并保留原 approved run 和导出记录。

## 已知限制

- H04 的页面和 API 先使用服务层样例数据展示闭环。
- 重开流程先实现服务层控制和文档说明，完整页面审批工作台留到后续真实试运行迭代。
- 差异说明先提供结构化字段，不自动生成复杂自然语言解释。
