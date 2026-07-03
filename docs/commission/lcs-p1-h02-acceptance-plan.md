# LCS-P1-H02 验收加固与试运行准备计划

## 基线

- Repo: `keqi119/leasing-commission-system`
- Baseline commit: `7dbad44 feat: initialize leasing commission system mvp`
- 唯一工作目录：`D:\leasing-commission-system`
- 废弃目录：`D:\OneDrive\文档\leasing-commission-system`
- 当前阶段分支：`feature/lcs-p1-h02-acceptance-hardening`

## 隔离边界

H02 只做 MVP 验收、加固、试运行准备，不做大功能扩展。仓库不得引用：

```text
fleet-ops
auto-subscription-platform
电动车订阅
车队运营
D:\Projects\auto-subscription-platform
```

隔离检查命令：

```bash
pnpm check:project-isolation
```

## 验收种子数据

一键生成：

```bash
pnpm seed:acceptance
```

种子数据覆盖：

- 考核周期：2026-04
- 部门目标：519,000 元
- 自有车已审核租金收入：400,000 元
- 外调利润回款：80,000 元
- 历史欠款本月回收：39,000 元
- 本期可计提收入：519,000 元
- 达成率：100%
- 提成比例：10%
- 部门提成池：51,900 元
- 销售 A：300,000 元
- 销售 B：139,000 元
- 销售 C：80,000 元

反例覆盖：未收款订单、押金、未审批指标调整、已审批指标调整、外调订单只按利润回款参与考核。

## 验收测试

运行：

```bash
pnpm test
```

覆盖：

1. 2026-04 主场景计算稳定。
2. 外调利润参与达成率和个人贡献率。
3. 押金完全排除在收入和提成之外。
4. 未收款订单不参与提成。
5. 历史欠款本月回收参与本月提成。
6. 未审批指标调整不影响目标。
7. 审批通过指标调整后影响目标。
8. 老板审批后结算锁定。
9. 未审批前禁止导出正式奖金表。
10. 审批后允许导出正式奖金表。
11. 页面展示模型、API 计算结果、导出 xlsx 金额一致。

## H02 完成验证

```bash
pnpm check:project-isolation
pnpm seed:acceptance
pnpm test
pnpm typecheck
pnpm prisma:validate
pnpm build
```
