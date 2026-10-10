// Lógica financiera: totales, desgloses, saldo y comparaciones.

import type { Transaction, IncomeSource, SavingsGoal } from '../types';
import { monthKey, startOfMonth, endOfMonth, addMonthsKey, todayISO } from './dates';
import { round2 } from './money';

export const INCOME_SOURCES: IncomeSource[] = [
  'Trabajo en el almacén',
  'Venta de helados',
  'Reparto y venta de bidones de agua',
  'Otros ingresos',
];

export const EXPENSE_CATEGORIES = [
  'Comida',
  'Transporte',
  'Gimnasio',
  'Ropa',
  'Tecnología',
  'Servicios',
  'Hogar',
  'Salud',
  'Educación',
  'Ocio',
  'Regalos',
  'Impuestos y trámites',
  'Otros gastos',
];

/** Movimientos dentro de un mes (clave AAAA-MM). */
export function transactionsOfMonth(transactions: Transaction[], key: string): Transaction[] {
  return transactions.filter((t) => monthKey(t.date) === key);
}

/**
 * Resumen de un conjunto de movimientos.
 * Las transferencias entre categorías propias NO cuentan como ingresos ni como gastos.
 */
export interface MonthSummary {
  income: number;
  expense: number;
  balance: number;
  bySource: { label: string; total: number; count: number }[];
  byCategory: { label: string; total: number; count: number }[];
  incomeCount: number;
  expenseCount: number;
}

export function summarize(transactions: Transaction[]): MonthSummary {
  let income = 0;
  let expense = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  const sources = new Map<string, { total: number; count: number }>();
  const categories = new Map<string, { total: number; count: number }>();

  for (const t of transactions) {
    if (t.transfer) continue;
    if (t.type === 'ingreso') {
      income += t.amount;
      incomeCount++;
      const prev = sources.get(t.category) ?? { total: 0, count: 0 };
      sources.set(t.category, { total: prev.total + t.amount, count: prev.count + 1 });
    } else {
      expense += t.amount;
      expenseCount++;
      const prev = categories.get(t.category) ?? { total: 0, count: 0 };
      categories.set(t.category, { total: prev.total + t.amount, count: prev.count + 1 });
    }
  }

  return {
    income: round2(income),
    expense: round2(expense),
    balance: round2(income - expense),
    incomeCount,
    expenseCount,
    bySource: [...sources.entries()]
      .map(([label, v]) => ({ label, total: round2(v.total), count: v.count }))
      .sort((a, b) => b.total - a.total),
    byCategory: [...categories.entries()]
      .map(([label, v]) => ({ label, total: round2(v.total), count: v.count }))
      .sort((a, b) => b.total - a.total),
  };
}

/** Saldo acumulado histórico (excluye transferencias). */
export function accumulatedBalance(transactions: Transaction[]): number {
  return summarize(transactions).balance;
}

/**
 * Saldo registrado hasta el final de un mes.
 * Útil para saber cuánto dinero había acumulado en esa fecha.
 */
export function balanceUpTo(transactions: Transaction[], key: string): number {
  const last = endOfMonth(key);
  return summarize(transactions.filter((t) => t.date <= last)).balance;
}

/** Comparación de un mes contra el anterior. */
export interface MonthComparison {
  currentKey: string;
  previousKey: string;
  hasPrevious: boolean;
  incomeDelta: number | null;
  expenseDelta: number | null;
  balanceDelta: number | null;
}

export function compareWithPreviousMonth(transactions: Transaction[], key: string): MonthComparison {
  const prevKey = addMonthsKey(key, -1);
  const current = summarize(transactionsOfMonth(transactions, key));
  const prevList = transactionsOfMonth(transactions, prevKey);
  const hasPrevious = prevList.length > 0;
  if (!hasPrevious) {
    return {
      currentKey: key,
      previousKey: prevKey,
      hasPrevious: false,
      incomeDelta: null,
      expenseDelta: null,
      balanceDelta: null,
    };
  }
  const prev = summarize(prevList);
  const pct = (cur: number, before: number): number | null =>
    before === 0 ? null : Math.round(((cur - before) / Math.abs(before)) * 100);
  return {
    currentKey: key,
    previousKey: prevKey,
    hasPrevious: true,
    incomeDelta: pct(current.income, prev.income),
    expenseDelta: pct(current.expense, prev.expense),
    balanceDelta: pct(current.balance, prev.balance),
  };
}

/** Meses con movimiento, en orden descendente. */
export function monthsWithHistory(transactions: Transaction[]): string[] {
  const set = new Set(transactions.map((t) => monthKey(t.date)));
  const current = monthKey(todayISO());
  set.add(current);
  return [...set].sort().reverse();
}

/** Filtros del historial de movimientos. */
export interface TransactionFilters {
  month: string | 'todos';
  type: Transaction['type'] | 'todos';
  category: string | 'todas';
}

export function filterTransactions(transactions: Transaction[], f: TransactionFilters): Transaction[] {
  return transactions
    .filter((t) => (f.month === 'todos' ? true : monthKey(t.date) === f.month))
    .filter((t) => (f.type === 'todos' ? true : t.type === f.type))
    .filter((t) => (f.category === 'todas' ? true : t.category === f.category))
    .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
}

/** Categorías realmente usadas, para el selector de filtros. */
export function usedCategories(transactions: Transaction[]): string[] {
  return [...new Set(transactions.map((t) => t.category))].sort((a, b) => a.localeCompare(b, 'es'));
}

// ---------- Objetivos de ahorro ----------

export interface SavingsStatus extends SavingsGoal {
  remaining: number;
  percent: number;
}

export function savingsStatus(goal: SavingsGoal): SavingsStatus {
  const target = Math.max(0, goal.target);
  const saved = Math.max(0, goal.saved);
  const remaining = round2(Math.max(0, target - saved));
  const percent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  return { ...goal, remaining, percent };
}

/** Inicio del mes en curso (para filtros por defecto). */
export function currentMonthKey(): string {
  return monthKey(todayISO());
}

export function currentMonthRange(): { from: string; to: string } {
  const t = todayISO();
  return { from: startOfMonth(t), to: endOfMonth(t) };
}
