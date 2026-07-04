# LCS-P1-H08 真实数据入口与台账 CRUD 补齐计划

## 目标

H08 将系统从展示型页面推进到线下单机 V1 可操作版本。固定工作区为 `D:\leasing-commission-system`。

本阶段重点：

- 统一本地 SQLite 路径为 `local-data/db/dev.db`
- 增加本地试用角色选择器，页面操作不再依赖手工设置请求头
- 为员工、车辆、周期、指标、规则、订单、收入、外调利润、押金、车辆状态、指标调整提供真实录入入口
- 各业务板块内嵌真实文件上传、预览、提交，并写入 ImportBatch / ImportBatchRow
- 财务可在页面审核租金收入和外调利润
- HR 可生成真实结算 run 并提交审批
- 老板可审批或驳回结算 run
- HR 只能基于 approved run 导出正式发放表，导出记录绑定 runNo

## 技术方案

- `packages/database/prisma/seed.acceptance.ts` 默认生成 `local-data/db/dev.db`
- `packages/database/src/index.ts` 优先读取 `local-data/db/dev.db`
- `apps/web/src/server/offline-v1-db.ts` 集中封装线下 V1 的 CRUD、导入提交、财务审核和本地导出
- `apps/web/src/components/LocalRoleSwitcher.tsx` 提供本地试用角色模拟
- `apps/web/src/components/OfflineCrudPanel.tsx` 和 `OfflineCrudPage.tsx` 提供统一台账录入体验
- `/api/commission/offline/[resource]` 提供列表、新增、审核类操作

## 已知限制

- 本地角色选择只是单机试用模拟，不是正式登录认证
- 提成规则明细编辑仍是轻量入口，复杂规则维护后续继续增强
- 删除采用后续作废/关闭思路，本阶段不做硬删除
- 线上 HTTPS、多用户会话、生产数据库不属于 H08 范围
