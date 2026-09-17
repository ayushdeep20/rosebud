// lib/money.ts
import { Prisma } from "@prisma/client";

export type Money = Prisma.Decimal;

export function toMoney(value: string | number): Money {
  return new Prisma.Decimal(value);
}

export function addMoney(a: Money, b: Money): Money {
  return a.add(b);
}

export function subtractMoney(a: Money, b: Money): Money {
  return a.sub(b);
}

export function isNegative(a: Money): boolean {
  return a.isNegative();
}

export function formatMoney(a: Money): string {
  return `₹${a.toFixed(2)}`;
}