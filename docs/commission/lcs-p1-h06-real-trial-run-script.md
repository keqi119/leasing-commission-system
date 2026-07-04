# LCS-P1-H06 Real Trial Run Script

Use this script for the 2026-05 sanitized real-period trial run. Failed steps are recorded as Trial Run Issues on `/commission/trial-runs/[id]`.

## 老板

入口页面：`/commission/approvals`, `/commission/trial-runs/[id]`, `/commission/settlements/[runId]/diff`

测试动作：

1. Open the approval queue.
2. Confirm the submitted settlement runNo.
3. Review diff when a recalculated run exists.
4. Reject a run with a reason when blockers or amount questions remain.
5. Approve the final run after issues and adjustments are settled.

预期结果：

- Approval page shows the exact runNo under review.
- Rejection requires a reason and the reason is visible to HR.
- Approved run is retained and becomes exportable.

失败时记录到哪里：

- Create a Trial Run Issue with category `SETTLEMENT` or `EXPORT`, owner role `HR`, severity `BLOCKER` when approval or export cannot continue.

## 销售

入口页面：`/commission/orders`, `/commission/revenue`, `/commission/external-profit`, `/commission/deposits`, `/commission/trial-runs/[id]`

测试动作：

1. Confirm orders and revenue belong to the correct sales user.
2. Confirm external orders only include remitted profit.
3. Confirm deposits are recorded but excluded from revenue and commission.
4. Resolve sales-owned deposit or external-profit issues.

预期结果：

- Sales can identify personal ledger records.
- Abnormal deposits appear as risk prompts but do not enter commission revenue.
- External profit participates only by remitted profit amount.

失败时记录到哪里：

- Create a Trial Run Issue with category `DEPOSIT`, `ORDER`, or `EXTERNAL_PROFIT`, owner role `SALES`.

## 财务

入口页面：`/commission/revenue`, `/commission/external-profit`, `/commission/trial-run-checks`, `/commission/trial-runs/[id]`

测试动作：

1. Review imported rent receipts.
2. Review imported external profit receipts.
3. Confirm pending or rejected receipts are excluded from commissionable revenue.
4. Resolve finance-owned BLOCKER issues.

预期结果：

- Trial-run checks show approved rent revenue, unapproved revenue, approved external profit, and external profit total.
- Any unapproved rent revenue creates a finance issue suggestion.
- HR cannot submit approval while BLOCKER issues remain open.

失败时记录到哪里：

- Create or update a Trial Run Issue with category `REVENUE`, owner role `FINANCE`.

## 资管

入口页面：`/commission/vehicle-events`, `/commission/target-adjustments`, `/commission/trial-run-checks`, `/commission/trial-runs/[id]`

测试动作：

1. Confirm vehicle status events for the period.
2. Submit target adjustment request when a status event should affect the target.
3. Confirm unapproved adjustments do not affect the target.
4. Confirm approved adjustments affect the next calculation.

预期结果：

- Trial-run checks show vehicle status event count and target adjustment status.
- Vehicle status alone does not change target automatically.
- Target changes only after boss approval.

失败时记录到哪里：

- Create a Trial Run Issue with category `TARGET`, owner role `ASSET_MANAGER`.

## HR

入口页面：`/commission/trial-run-checks`, `/commission/trial-runs`, `/commission/adjustments`, `/commission/settlements`, `/commission/exports`

测试动作：

1. Review trial-run checks after import.
2. Create a Trial Run.
3. Create issues for pending revenue, abnormal deposits, or target adjustment risks.
4. Create manual adjustments only with reason and evidence when needed.
5. Calculate settlement run v1.
6. Submit to boss only after BLOCKER issues are closed and pending adjustments are handled.
7. Recalculate run v2 after rejection or approved adjustment.
8. Export only from the approved run.
9. Generate trial-run report.

预期结果：

- Pages show current period, Trial Run, Settlement Run, status, blockers, pending adjustments, submission/export readiness, and next action.
- Recalculation creates a new runNo and does not overwrite v1.
- Export record binds runId and runNo.
- Report references approved runNo, issue summary, adjustment total, and export record.

失败时记录到哪里：

- Create a Trial Run Issue with category matching the failure, owner role set to the responsible role, and severity `BLOCKER`, `MAJOR`, `MINOR`, or `INFO`.
