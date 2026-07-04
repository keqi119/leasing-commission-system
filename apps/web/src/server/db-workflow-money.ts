export function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  return Number(value);
}

export function toBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

export function sumCents(values: Array<number | bigint | null | undefined>): number {
  return values.reduce<number>((total, value) => total + toNumber(value), 0);
}

export function signedAdjustmentCents(input: { direction: "ADD" | "DEDUCT"; amountCents: number }): number {
  return input.direction === "DEDUCT" ? -Math.abs(input.amountCents) : Math.abs(input.amountCents);
}
