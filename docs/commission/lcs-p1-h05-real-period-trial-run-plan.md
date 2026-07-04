# LCS-P1-H05 Real-Period Trial Run Plan

## Scope

H05 upgrades the H04 sample workflow into a persisted trial-run workflow for a sanitized real accounting period.

The fixed workspace is `D:\leasing-commission-system`.

Do not use `D:\OneDrive\文档\leasing-commission-system`, `D:\Projects`, `D:\Projects\auto-subscription-platform`, or any fleet-ops project path.

## Target Flow

1. Prepare a sanitized real-period data package under `local-data/real-periods/`.
2. Import standard templates for employees, vehicles, targets, orders, revenue, external profit, deposits, and vehicle events.
3. Persist committed import batches and rows.
4. HR creates a `TrialRun`.
5. The system creates persisted `CommissionSettlementRun` snapshots.
6. Issues are created, assigned, resolved, or accepted as risk.
7. Manual adjustments are created and approved without mutating revenue ledgers.
8. Boss rejects or approves settlement runs.
9. Recalculation creates a new runNo and keeps old runs.
10. HR exports only from an approved run, and the export record binds to runId/runNo.
11. A `TrialRunReport` is generated and retained.

## Implemented Persistence

- `TrialRun`
- `TrialRunIssue`
- `TrialRunReport`
- `CommissionAdjustment`
- `PeriodReopenRequest`
- `CommissionSettlementRun`
- `CommissionSettlementLine`
- `CommissionExportRecord`

## Controls

- Open `BLOCKER` issues prevent HR submission.
- Draft or submitted adjustments prevent final submission unless explicitly excluded.
- Rejected runs cannot be exported.
- Approved/exported runs remain immutable snapshots.
- Reopen requests retain old approved runs and export records.

## Known Limits

- Only standard templates are supported.
- No bank auto-reconciliation, OCR, email parsing, payroll integration, or multi-ledger accounting.
- Prisma schema remains the data model source; the MVP local SQLite runtime uses a raw `sql.js` client for deterministic local persistence.
