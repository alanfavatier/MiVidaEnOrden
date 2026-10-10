import { describe, it, expect } from 'vitest';
import { challengeInfo, clampPercent, goalProgress, isOverdue, sortGoals, stepsDone } from './goals';
import { createSeedGoals, createSeedHabits, SEED_GOALS } from './seed';
import type { Goal } from '../types';

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    title: 'Objetivo',
    description: '',
    category: 'Hogar',
    priority: 'media',
    startDate: null,
    dueDate: null,
    status: 'pendiente',
    steps: [],
    notes: '',
    budget: null,
    progress: 0,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('goalProgress', () => {
  it('usa el progreso manual cuando no hay pasos', () => {
    expect(goalProgress(goal({ progress: 42 }))).toBe(42);
    expect(goalProgress(goal({ progress: 250 }))).toBe(100);
    expect(goalProgress(goal({ progress: -5 }))).toBe(0);
  });

  it('deriva el progreso de los pasos cuando existen', () => {
    const g = goal({
      progress: 99,
      steps: [
        { id: '1', title: 'a', done: true },
        { id: '2', title: 'b', done: false },
        { id: '3', title: 'c', done: false },
        { id: '4', title: 'd', done: true },
      ],
    });
    expect(goalProgress(g)).toBe(50);
    expect(stepsDone(g)).toEqual({ done: 2, total: 4 });
  });

  it('clampPercent limita al rango 0-100', () => {
    expect(clampPercent(-10)).toBe(0);
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(33.6)).toBe(34);
    expect(clampPercent(NaN)).toBe(0);
  });
});

describe('sortGoals', () => {
  it('ordena por prioridad y luego por fecha límite', () => {
    const goals = [
      goal({ id: 'b', priority: 'alta', dueDate: '2026-12-31' }),
      goal({ id: 'a', priority: 'alta', dueDate: '2026-11-01' }),
      goal({ id: 'c', priority: 'baja' }),
      goal({ id: 'd', priority: 'media' }),
    ];
    expect(sortGoals(goals).map((g) => g.id)).toEqual(['a', 'b', 'd', 'c']);
  });
});

describe('isOverdue', () => {
  it('detecta vencidos solo si no están completados', () => {
    expect(isOverdue(goal({ dueDate: '2026-10-01' }), '2026-10-10')).toBe(true);
    expect(isOverdue(goal({ dueDate: '2026-10-01', status: 'completado' }), '2026-10-10')).toBe(false);
    expect(isOverdue(goal({ dueDate: '2026-12-01' }), '2026-10-10')).toBe(false);
    expect(isOverdue(goal({ dueDate: null }), '2026-10-10')).toBe(false);
  });
});

describe('challengeInfo (desafío de 60 días)', () => {
  it('sin fecha de inicio no está activo', () => {
    const info = challengeInfo({ startDate: null, totalDays: 60 }, '2026-10-10');
    expect(info.active).toBe(false);
    expect(info.currentDay).toBe(0);
    expect(info.progress).toBe(0);
    expect(info.remaining).toBe(60);
  });

  it('el día de inicio es el día 1', () => {
    const info = challengeInfo({ startDate: '2026-10-10', totalDays: 60 }, '2026-10-10');
    expect(info.currentDay).toBe(1);
    expect(info.progress).toBe(2); // 1/60 = 1.66% → 2
    expect(info.remaining).toBe(59);
  });

  it('avanza con los días y se detiene en el tope', () => {
    expect(challengeInfo({ startDate: '2026-08-12', totalDays: 60 }, '2026-10-10').currentDay).toBe(60);
    expect(challengeInfo({ startDate: '2026-08-13', totalDays: 60 }, '2026-10-10').currentDay).toBe(59);
    // Antes del inicio no cuenta.
    const before = challengeInfo({ startDate: '2026-10-20', totalDays: 60 }, '2026-10-10');
    expect(before.currentDay).toBe(0);
    expect(before.progress).toBe(0);
  });

  it('respeta la cantidad total de días configurada', () => {
    const info = challengeInfo({ startDate: '2026-10-01', totalDays: 30 }, '2026-10-11');
    expect(info.currentDay).toBe(11);
    expect(info.progress).toBe(37);
  });
});

describe('datos semilla', () => {
  it('crea los 25 objetivos pedidos, sin fechas límite ni progreso', () => {
    const goals = createSeedGoals();
    expect(goals).toHaveLength(SEED_GOALS.length);
    expect(goals).toHaveLength(25);
    for (const g of goals) {
      expect(g.dueDate).toBeNull();
      expect(g.progress).toBe(0);
      expect(g.status).toBe('pendiente');
      expect(g.budget).toBeNull();
      expect(g.startDate).toBeNull();
      expect(g.title.length).toBeGreaterThan(0);
    }
    // Categorías requeridas presentes.
    const cats = new Set(goals.map((g) => g.category));
    for (const c of [
      'Salud y cuidado personal',
      'Carrera y tecnología',
      'Dinero y compras',
      'Hogar',
      'Aprendizaje personal',
      'Organización',
    ]) {
      expect(cats.has(c as Goal['category'])).toBe(true);
    }
  });

  it('crea los 10 hábitos sugeridos sin historial', () => {
    const habits = createSeedHabits();
    expect(habits).toHaveLength(10);
    for (const h of habits) {
      expect(h.history).toEqual([]);
      expect(h.frequency).toEqual({ type: 'daily' });
      expect(h.name.length).toBeGreaterThan(0);
    }
    const names = habits.map((h) => h.name);
    expect(names).toContain('Ir al gimnasio');
    expect(names).toContain('Registrar mis ingresos y gastos');
    expect(names).toContain('Hacer skincare por la noche');
  });
});
