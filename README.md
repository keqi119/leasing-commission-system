# Leasing Commission System

Independent MVP for a small vehicle operating lease team to calculate, review, approve, and export sales commission settlements.

## Scope

- Project code lives in this repository only.
- Commission formulas live in `packages/commission-engine`.
- API and pages call the engine instead of duplicating formulas.
- Every settlement calculation produces a snapshot-oriented result.
- Approved settlements are locked from direct mutation.

## Stack

- pnpm monorepo
- Next.js App Router web/API app
- Prisma schema for the MVP data model
- Vitest for commission engine and workflow tests
- ExcelJS for approved payout export

## Commands

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm prisma:validate
pnpm build
pnpm dev
```

## Remote

GitHub: <https://github.com/keqi119/leasing-commission-system>

