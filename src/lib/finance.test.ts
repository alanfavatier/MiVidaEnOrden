import { describe, it, expect } from 'vitest';
import type { Transaction } from '../types';
import {
  accumulatedBalance,
  compareWithPreviousMonth,
  filterTransactions,
  monthsWithHistory,
  savingsStatus,
  summarize,
  transactionsOfMonth,
  usedCategories,
} from './finance';

let counter = 0;
function tx(partial: Partial<Transaction> & { type: Transaction['type']; amount: number; date: string }): Transaction {
  counter++;
  return {
    id: `t${counter}`,
    description: 'mov',
    category: partial.type === 'ingreso' ? 'Otros ingresos' : 'Otros gastos',
    notes: '',
    transfer: false,
    createdAt: new Date().toISOString(),
    ...partial,
  } as Transaction;
}

describe('summarize', () => {
  const movements = [
    tx({ type: 'ingreso', amount: 1000, date: '2026-10-01', category: 'Trabajo en el almacén' }),
    tx({ type: 'ingreso', amount: 500, date: '2026-10-05', category: 'Venta de helados' }),
    tx({ type: 'gasto', amount: 300, date: '2026-10-02', category: 'Comida' }),
    tx({ type: 'gasto', amount: 200, date: '2026-10-03', category: 'Comida' }),
    tx({ type: 'gasto', amount: 100, date: '2026-10-04', category: 'Transporte' }),
  ];

  it('suma ingresos y gastos por separado', () => {
    const s = summarize(movements);
    expect(s.income).toBe(1500);
    expect(s.expense).toBe(600);
    expect(s.balance).toBe(900);
    expect(s.incomeCount).toBe(2);
    expect(s.expenseCount).toBe(3);
  });

  it('desglosa por fuente y por categoría, ordenado de mayor a menor', () => {
    const s = summarize(movements);
    expect(s.bySource).toEqual([
      { label: 'Trabajo en el almacén', total: 1000, count: 1 },
      { label: 'Venta de helados', total: 500, count: 1 },
    ]);
    expect(s.byCategory[0]).toEqual({ label: 'Comida', total: 500, count: 2 });
    expect(s.byCategory[1]).toEqual({ label: 'Transporte', total: 100, count: 1 });
  });

  it('las transferencias no cuentan como ingreso ni gasto', () => {
    const withTransfer = [
      ...movements,
      tx({ type: 'ingreso', amount: 999, date: '2026-10-06', transfer: true, category: 'Otros ingresos' }),
      tx({ type: 'gasto', amount: 999, date: '2026-10-06', transfer: true, category: 'Otros gastos' }),
    ];
    const s = summarize(withTransfer);
    expect(s.income).toBe(1500);
    expect(s.expense).toBe(600);
    expect(s.balance).toBe(900);
    expect(s.bySource.find((x) => x.label === 'Otros ingresos')).toBeUndefined();
    expect(s.byCategory.find((x) => x.label === 'Otros gastos')).toBeUndefined();
  });

  it('responde 0 con lista vacía', () => {
    const s = summarize([]);
    expect(s).toMatchObject({ income: 0, expense: 0, balance: 0 });
    expect(s.bySource).toEqual([]);
    expect(s.byCategory).toEqual([]);
  });
});

describe('transacciones por mes y saldo', () => {
  const all = [
    tx({ type: 'ingreso', amount: 100, date: '2026-09-10' }),
    tx({ type: 'gasto', amount: 40, date: '2026-09-20' }),
    tx({ type: 'ingreso', amount: 200, date: '2026-10-05' }),
    tx({ type: 'gasto', amount: 50, date: '2026-10-15' }),
  ];

  it('filtra por mes', () => {
    expect(transactionsOfMonth(all, '2026-10')).toHaveLength(2);
    expect(transactionsOfMonth(all, '2026-09')).toHaveLength(2);
    expect(transactionsOfMonth(all, '2026-08')).toHaveLength(0);
  });

  it('acumula el saldo histórico completo', () => {
    expect(accumulatedBalance(all)).toBe(210); // 300 - 90
  });

  it('lista los meses con historial', () => {
    const months = monthsWithHistory(all);
    expect(months).toContain('2026-09');
    expect(months).toContain('2026-10');
    expect(months).toEqual([...months].sort().reverse());
  });
});

describe('compareWithPreviousMonth', () => {
  it('sin datos del mes anterior no compara', () => {
    const current = [tx({ type: 'ingreso', amount: 100, date: '2026-10-05' })];
    const r = compareWithPreviousMonth(current, '2026-10');
    expect(r.hasPrevious).toBe(false);
    expect(r.incomeDelta).toBeNull();
    expect(r.balanceDelta).toBeNull();
  });

  it('calcula el porcentaje de variación', () => {
    const all = [
      tx({ type: 'ingreso', amount: 100, date: '2026-09-05' }),
      tx({ type: 'gasto', amount: 50, date: '2026-09-06' }),
      tx({ type: 'ingreso', amount: 150, date: '2026-10-05' }),
      tx({ type: 'gasto', amount: 25, date: '2026-10-06' }),
    ];
    const r = compareWithPreviousMonth(all, '2026-10');
    expect(r.hasPrevious).toBe(true);
    expect(r.incomeDelta).toBe(50); // +50%
    expect(r.expenseDelta).toBe(-50); // -50%
    expect(r.balanceDelta).toBe(150); // balance 50 → 125 = +150%
  });
});

describe('filterTransactions', () => {
  const all = [
    tx({ id: 'a', type: 'ingreso', amount: 10, date: '2026-10-01', category: 'Otros ingresos' }),
    tx({ id: 'b', type: 'gasto', amount: 20, date: '2026-10-02', category: 'Comida' }),
    tx({ id: 'c', type: 'gasto', amount: 30, date: '2026-09-02', category: 'Comida' }),
  ];

  it('filtra por mes, tipo y categoría', () => {
    expect(filterTransactions(all, { month: '2026-10', type: 'todos', category: 'todas' })).toHaveLength(2);
    expect(filterTransactions(all, { month: 'todos', type: 'gasto', category: 'todas' })).toHaveLength(2);
    expect(filterTransactions(all, { month: 'todos', type: 'todos', category: 'Comida' })).toHaveLength(2);
    expect(
      filterTransactions(all, { month: '2026-10', type: 'gasto', category: 'Comida' }),
    ).toHaveLength(1);
    expect(filterTransactions(all, { month: 'todos', type: 'todos', category: 'todas' })).toHaveLength(3);
  });

  it('ordena de más reciente a más antiguo', () => {
    const r = filterTransactions(all, { month: 'todos', type: 'todos', category: 'todas' });
    expect(r.map((t) => t.id)).toEqual(['b', 'a', 'c']);
  });

  it('lista categorías usadas', () => {
    expect(usedCategories(all).sort()).toEqual(['Comida', 'Otros ingresos']);
  });
});

describe('savingsStatus', () => {
  it('calcula restante y porcentaje', () => {
    const s = savingsStatus({
      id: 's1',
      title: 'iPhone',
      target: 2000000,
      saved: 500000,
      createdAt: '',
      updatedAt: '',
    });
    expect(s.remaining).toBe(1500000);
    expect(s.percent).toBe(25);
  });

  it('no se pasa del 100% ni da negativos', () => {
    const s = savingsStatus({ id: 's2', title: 'x', target: 100, saved: 150, createdAt: '', updatedAt: '' });
    expect(s.percent).toBe(100);
    expect(s.remaining).toBe(0);
  });

  it('maneja precio estimado 0', () => {
    const s = savingsStatus({ id: 's3', title: 'x', target: 0, saved: 0, createdAt: '', updatedAt: '' });
    expect(s.percent).toBe(0);
    expect(s.remaining).toBe(0);
  });
});
