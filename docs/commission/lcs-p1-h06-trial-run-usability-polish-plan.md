# LCS-P1-H06 Trial Run Usability Polish Plan

## Goal

H06 focuses on first real-period trial-run usability. The system should clearly tell HR, finance, asset managers, sales, and the boss what the current period state is, why an action is blocked, and how to continue without overwriting historical settlement runs.

## Scope

- Keep the fixed local workspace as `D:\leasing-commission-system`.
- Keep H02, H03, H04, and H05 regression scenarios passing.
- Improve status guidance on trial-run checks, trial runs, adjustments, settlements, approvals, exports, and settlement diff pages.
- Centralize DB workflow error codes, money conversion, and status guidance helpers.
- Preserve raw SQL inside server workflow modules only.
- Produce a first-round trial-run report for the 2026-05 sanitized period.

## Service Changes

- `db-workflow-errors.ts` defines stable error codes and business-facing messages.
- `db-workflow-money.ts` centralizes cents conversion and sums.
- `db-workflow-status.ts` centralizes blocker, submission, export, and issue suggestion rules.
- `trial-run-db-workflow.ts` returns richer trial-run check data, including import batch count, entity counts, unapproved revenue, adjustment counts, and issue suggestions.
- API routes map workflow errors to `{ code, error }` responses.

## Page Changes

- `/commission/trial-run-checks`: show import batches, ledger counts, issue suggestions, and HR calculation readiness.
- `/commission/trial-runs`: show current Trial Run, current Settlement Run, export readiness, and next role.
- `/commission/trial-runs/[id]`: show blockers, major issues, adjustments, settlement versions, reports, and export bindings.
- `/commission/adjustments`: show status, requester, approver, evidence, reason, and applied run.
- `/commission/settlements`: show submit readiness, pending adjustments, blocker suggestions, rejected reasons, and diff links.
- `/commission/settlements/[runId]/diff`: show previous/current run and money deltas before detail rows.
- `/commission/approvals`: show the current submitted run and boss action required.
- `/commission/exports`: show exportable approved runs and blocked runs with business reasons.

## Validation

Run:

```powershell
pnpm check:project-isolation
pnpm seed:acceptance
pnpm test
pnpm typecheck
pnpm prisma:validate
pnpm build
```

## Out Of Scope

- Bank statement auto-reconciliation.
- Payroll system integration.
- OCR or email parsing.
- Complex BI.
- Multi-legal-entity accounting.
- Enterprise account login integration.
- Arbitrary legacy Excel parsing.
