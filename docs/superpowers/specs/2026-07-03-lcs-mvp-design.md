# LCS-P1-H01 Design

## Goal

Build an independent MVP for leasing company sales commission settlement. The system supports period setup, target/rule configuration, sales ledgers, finance review, asset target adjustment requests, HR trial calculation, boss approval, and HR payout export.

## Architecture

The repository is a pnpm monorepo. `apps/web` contains the Next.js App Router UI and route handlers. `packages/database` owns the Prisma schema and lazy Prisma client access. `packages/shared` owns roles, permissions, and status vocabulary. `packages/commission-engine` owns all pure commission formulas and workflow guards.

The web app imports the database package for persistence and the commission engine for calculation. UI pages must display engine outputs, not recalculate them. API handlers must enforce role permissions before mutations.

## Calculation Rules

All money values are integer cents. Rates use basis points where `10000` means `100%`.

Commissionable revenue equals approved owned-vehicle rent plus approved external profit remitted to the company plus approved historical receivable recovered this month. Deposits are recorded only for risk visibility and never included in revenue or commission. Unapproved asset target adjustments do not change target amounts; approved adjustments change the period target by `adjusted - original`.

Tier matching is not progressive. The achievement rate falls into one tier, and the full commissionable revenue uses that tier rate.

## Workflow

HR calculates a settlement run after finance locks reviewable revenue. The engine returns department metrics, per-salesperson lines, payout split, warnings, and snapshot source totals. HR submits the run to boss approval. Boss-approved runs cannot be mutated directly. Export is allowed only after boss approval and records the export batch.

## Pages

The first screen is `/commission`, an operational dashboard. Supporting routes cover periods, targets, rules, orders, revenue, external profit, deposits, receivables, vehicle events, target adjustments, settlements, approvals, and exports. Page labels intentionally use only leasing commission terminology.

## Testing

Vitest covers the required calculation rules and the main 2026-04 acceptance scenario:

- achievement rate
- tier matching and full-amount commission
- unpaid/unreviewed receipts excluded
- external profit included in achievement and contribution
- deposits excluded
- historical recovery included
- contribution rate and payout split
- approved settlement lock
- approved and pending target adjustment behavior
- export allowed only after boss approval
