# LCS-P1-H06 Acceptance Checklist

## Project Isolation

- [ ] Work is performed in `D:\leasing-commission-system`.
- [ ] No real sensitive files are committed.
- [ ] `local-data/` and real/sensitive spreadsheet patterns remain ignored.
- [ ] `pnpm check:project-isolation` passes.

## 2026-05 Trial Run

- [ ] Standard imported data appears in `/commission/trial-run-checks`.
- [ ] Import batch count and source types are visible.
- [ ] Employee, vehicle, order, revenue, external profit, deposit, and vehicle event counts are visible.
- [ ] Unapproved rent revenue creates a finance issue suggestion.
- [ ] Abnormal deposit creates a sales issue suggestion.
- [ ] Vehicle status with no approved target adjustment creates an asset issue suggestion.
- [ ] HR creates a real Trial Run.
- [ ] Trial Run detail shows issues, adjustments, settlement runs, approved run, exports, and report.

## Approval Loop

- [ ] BLOCKER issue prevents HR submission.
- [ ] Resolving BLOCKER allows the next step.
- [ ] Pending manual adjustment blocks final submission unless HR explicitly excludes it.
- [ ] Approved manual adjustment enters only a new run.
- [ ] Boss rejection requires a reason.
- [ ] Rejected run cannot be exported.
- [ ] Recalculation creates a new runNo and keeps the old run.
- [ ] Diff page shows revenue, pool, and adjustment changes.
- [ ] Approved run can be exported.
- [ ] Export record binds runId and runNo.

## Reporting

- [ ] Trial-run report includes issue summary.
- [ ] Trial-run report includes adjustment total.
- [ ] Trial-run report includes approved runNo.
- [ ] Trial-run report includes export record reference.
- [ ] Known limitations are recorded.

## Verification Commands

- [ ] `pnpm seed:acceptance`
- [ ] `pnpm test`
- [ ] `pnpm typecheck`
- [ ] `pnpm prisma:validate`
- [ ] `pnpm build`

## Result

Conclusion: `PASS` / `PASS_WITH_LIMITATIONS` / `FAIL`
