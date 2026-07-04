# DB Workflow Migration Plan

## Current State

The MVP uses SQLite plus a raw sql.js client for local trial-run workflow persistence. This keeps the standalone desktop-style test environment simple and avoids requiring a running database service during early acceptance.

## Why Raw SQL Exists

- The workflow needs deterministic local fixtures for 2026-04 and 2026-05 acceptance scenarios.
- DB tables already match the Prisma schema, but the local runtime uses sql.js for zero-service execution.
- H05 introduced persisted TrialRun, TrialRunIssue, CommissionAdjustment, PeriodReopenRequest, TrialRunReport, settlement approval, and export binding records.

## H06 Risk Encapsulation

- Raw SQL is kept inside `apps/web/src/server/trial-run-db-workflow.ts`.
- Error codes and business messages are centralized in `apps/web/src/server/db-workflow-errors.ts`.
- Money conversion and cents summing are centralized in `apps/web/src/server/db-workflow-money.ts`.
- Status guidance and issue suggestion rules are centralized in `apps/web/src/server/db-workflow-status.ts`.
- Pages consume service-returned structures and guidance helpers; they do not execute SQL.

## Persisted Flows

- Trial Run creation and listing.
- Trial Run Issue creation, status update, and resolution.
- Commission Adjustment creation, submit, approve, reject, and apply-to-run.
- Settlement recalculation, submission, rejection, approval, and export binding.
- Period reopen request and approval.
- Trial-run report generation and retention.

## Remaining Migration Work

- Replace raw sql.js calls with Prisma Client or a production database adapter.
- Add transactional boundaries around multi-step approval and export operations for PostgreSQL or MySQL.
- Add migration tests against the chosen production database.
- Move local fixture setup into explicit seed scripts per environment.
- Add DB-level constraints for immutable approved runs and export records.

## Production Database Notes

- Amount fields must remain integer cents.
- Achievement rates and commission rates should remain basis points or precise decimals.
- Approved settlement runs must remain immutable history.
- Export records must keep runId and runNo binding.
- Reopen flows must not overwrite previously approved runs or export records.
- Audit and approval logs should be append-only.

## Suggested Future Stage

Implement this migration during deployment preparation or the first production pilot hardening stage, after the local MVP trial-run process is accepted.
