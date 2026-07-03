# LCS-P1-H05 Acceptance Checklist

## Workspace

- [ ] Work is only in `D:\leasing-commission-system`.
- [ ] No real data is committed.
- [ ] `.gitignore` excludes `local-data/` and real/sensitive spreadsheet suffixes.

## Real-Period Import

- [ ] Standard templates can be previewed before commit.
- [ ] Invalid preview rows cannot be committed.
- [ ] Import batches and rows are retained.
- [ ] 2026-05 real-period data does not overwrite 2026-04 acceptance data.

## Persisted Workflow

- [ ] HR can create a persisted trial run.
- [ ] Trial run issues can be created and resolved.
- [ ] Open blocker issues prevent HR submission.
- [ ] Manual adjustments do not mutate revenue ledgers.
- [ ] Approved adjustments enter only a new settlement run.
- [ ] Rejected runs cannot be exported.
- [ ] Recalculation creates a new runNo.
- [ ] Approved runs can be exported.
- [ ] Export records bind to runId and runNo.
- [ ] Reopen requests preserve prior approved runs and exports.
- [ ] Trial-run reports reference the correct approved runNo and import batch ids.

## Verification

- [ ] `pnpm check:project-isolation`
- [ ] `pnpm seed:acceptance`
- [ ] `pnpm test`
- [ ] `pnpm typecheck`
- [ ] `pnpm prisma:validate`
- [ ] `pnpm build`
