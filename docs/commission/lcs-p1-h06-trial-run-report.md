# LCS-P1-H06 Trial Run Report

## Basic Information

- Trial run name: 2026-05 first sanitized real-period trial run
- Period: 2026-05
- Department: Direct leasing team
- Git commit: to be filled after H06 commit
- Data source: standard import batches plus manual workflow records
- approved runNo: generated after boss approval
- Report result: PASS_WITH_LIMITATIONS

## Data Review

- Import batches: employees, vehicles, targets, orders, revenue, external-profit, deposits, vehicle-events
- Department target: recorded in cents in DB and displayed in yuan on pages
- Confirmed revenue: approved rent revenue plus approved external profit plus historical receivable recovered
- Deposit rule: deposits are excluded from revenue and commission
- External profit rule: only remitted profit participates in achievement and contribution

## Issue Summary

- BLOCKER: unapproved rent revenue must be reviewed by finance before HR submits approval.
- MAJOR: abnormal deposit must be checked by sales or HR before final settlement.
- MAJOR: vehicle status and target adjustment state must be reviewed by asset manager and boss.
- MINOR / INFO: usability or explanation issues that do not change payout may be accepted as risk.

## 人工调整

- Manual adjustments do not modify original revenue ledgers.
- Draft or submitted adjustments do not enter a settlement run.
- Approved adjustments enter only a newly recalculated run.
- Applied adjustments show the applied runNo and are not directly editable.

## Approval And Recalculation

- Run v1 may be submitted after blockers are closed or explicitly excluded as allowed by HR policy.
- Boss rejection keeps run v1 and records the rejection reason.
- HR recalculation creates run v2 and keeps run v1 history.
- Diff page compares run v1 and run v2 for target, revenue, pool, contribution, payout, frozen amount, and adjustment amount.

## 导出记录

- Formal export is allowed only for approved run.
- Export record binds settlement runId and approved runNo.
- Rejected, calculated, or submitted runs return a business error and cannot be exported.

## 已知限制 / Known Limitations

- Local MVP still uses SQLite with a raw sql.js workflow client.
- Standard template import is supported; arbitrary legacy spreadsheet parsing is out of scope.
- Enterprise login integration is out of scope.
- Bank statement auto-reconciliation is out of scope.
- Payroll system integration is out of scope.

## Acceptance Conclusion

Conclusion: PASS_WITH_LIMITATIONS

Reason: the real-period trial-run loop is persisted and traceable; production database migration and enterprise authentication remain future work.
