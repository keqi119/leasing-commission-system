# LCS-P1-H03 试运行数据导入与录入体验优化计划

## 目标

本阶段让试运行数据可以通过标准 Excel / CSV 模板进入系统，避免只依赖手工录入或内置验收种子数据。导入必须先预览、校验、展示逐行错误，再允许无错误批次提交。

## 范围

本阶段实现：

- 标准导入模板：员工、车辆、收入指标、订单、租金收入、外调利润回款、押金、车辆状态流水。
- 导入预览：必填、金额、日期、周期、员工、车辆、订单依赖和锁定周期校验。
- 导入提交：预览无错误后整批提交，并保留批次和行级追溯模型。
- 常用录入页优化：订单、收入、外调利润、押金、HR 试算页增加筛选、状态、导入入口和数据来源说明。
- 试运行校验报表：汇总目标、订单应收、已审核收入、外调利润、押金风险、未收款和未审核项。

本阶段不实现：

- 银行流水自动对账。
- 邮件自动识别指标。
- OCR 或图片识别。
- 任意历史 Excel 的混合结构自动解析。
- 工资系统对接。

## 设计

导入逻辑集中在 `apps/web/src/server/imports.ts`。页面和 API 不直接写业务公式，只调用导入服务和 `@lcs/commission-engine`。

新增 API：

- `GET /api/commission/imports/templates`
- `POST /api/commission/imports/preview`
- `POST /api/commission/imports/commit`
- `GET /api/commission/imports/batches`
- `GET /api/commission/imports/batches/:id`

新增页面：

- `/commission/imports`
- `/commission/trial-run-checks`

新增数据模型：

- `ImportBatch`
- `ImportBatchRow`

## 校验策略

导入预览阶段统一返回：

- 总行数、有效行数、错误行数。
- 行号、原始数据、规范化数据。
- 错误码、业务错误提示。
- 风险提示。

存在任意错误行时，提交接口拒绝写入。周期已审批或关闭时拒绝导入影响结算的数据；财务锁定周期拒绝导入收入和外调利润。

## 验证

本阶段保留 H02 计算与导出金标准，新增导入和试运行测试。完成时必须通过：

```bash
pnpm check:project-isolation
pnpm seed:acceptance
pnpm test
pnpm typecheck
pnpm prisma:validate
pnpm build
```
