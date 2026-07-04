# Real-Period Data Preparation Guide

## Local Folder

Place real-period files only under:

```text
D:\leasing-commission-system\local-data\real-periods\
```

This folder is ignored by Git. Do not commit real or sensitive files.

## Required Files

Use the standard templates embedded at the bottom of each business ledger page:

- employees
- vehicles
- targets
- orders
- revenue
- external-profit
- deposits
- vehicle-events

Do not import arbitrary historical spreadsheets with merged cells or formulas. Convert them into the standard templates first.

## Desensitization Rules

- Customer names may be replaced with `客户A`, `客户B`.
- Plate numbers may be replaced with values like `粤B****1`.
- Sales names may use internal test names or `销售A`.
- Proof links may use mock URLs.
- Bank account numbers must not enter the repository.
- ID card numbers, phone numbers, and bank card numbers must not enter the repository.

## Import Rules

1. Upload and preview first.
2. Fix all validation errors.
3. Commit only when every row is valid.
4. Keep the import batch id for the trial-run report.
5. Approved or closed periods must not receive settlement-impacting imports unless a controlled reopen has been approved.

## External Profit Rule

External-profit templates record only the profit remitted to the company account. Do not add external-order revenue, cost, or margin accounting columns.

## Deposit Rule

Deposits are recorded for risk visibility only. They do not enter revenue or commission.
