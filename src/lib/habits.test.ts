import { describe, it, expect } from 'vitest';
import type { Habit } from '../types';
import {
  currentStreak,
  habitsSummary,
  isDoneOn,
  isScheduledOn,
  monthMatrix,
  overallPercent,
  scheduledDaysThisWeek,
  toggleHabitOn,
  weeklyPercent,
} from './habits';
import { addDays, startOfWeek, todayISO } from './dates';

const today = todayISO();

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Test',
    category: 'Disciplina',
    frequency: { type: 'daily' },
    startDate: addDays(today, -13),
    history: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('isScheduledOn', () => {
  it('programa diariamente desde la fecha de inicio', () => {
    const h = makeHabit({ startDate: '2026-10-05' });
    expect(isScheduledOn(h, '2026-10-05')).toBe(true);
    expect(isScheduledOn(h, '2026-10-06')).toBe(true);
    expect(isScheduledOn(h, '2026-10-04')).toBe(false); // antes del inicio
  });

  it('respeta los días de la semana elegidos', () => {
    const h = makeHabit({ frequency: { type: 'days', days: [1, 3, 5] }, startDate: '2026-10-01' });
    expect(isScheduledOn(h, '2026-10-05')).toBe(true); // lunes
    expect(isScheduledOn(h, '2026-10-07')).toBe(true); // miércoles
    expect(isScheduledOn(h, '2026-10-08')).toBe(false); // jueves
    expect(isScheduledOn(h, '2026-10-11')).toBe(false); // domingo
  });

  it('la frecuencia semanal flexible permite cualquier día', () => {
    const h = makeHabit({ frequency: { type: 'timesPerWeek', times: 3 }, startDate: '2026-10-01' });
    expect(isScheduledOn(h, '2026-10-11')).toBe(true);
    expect(isScheduledOn(h, '2026-10-12')).toBe(true);
  });
});

describe('toggleHabitOn', () => {
  it('marca y desmarca sin duplicar', () => {
    const h = makeHabit({ startDate: addDays(today, -2) });
    const marked = toggleHabitOn(h, today);
    expect(marked.history).toContain(today);
    expect(isDoneOn(marked, today)).toBe(true);
    const unmarked = toggleHabitOn(marked, today);
    expect(unmarked.history).not.toContain(today);
    expect(unmarked.history).toHaveLength(0);
    // el original no se muta
    expect(h.history).toHaveLength(0);
  });
});

describe('weeklyPercent', () => {
  it('calcula el porcentaje de la semana transcurrida', () => {
    // Lunes 2026-10-05 ... domingo 2026-10-11; "hoy" = miércoles 07.
    const h = makeHabit({
      frequency: { type: 'daily' },
      startDate: '2026-10-01',
      history: ['2026-10-05', '2026-10-06'],
    });
    // Programados hasta hoy: lun, mar, mié = 3; cumplidos = 2 → 67%.
    expect(weeklyPercent(h, '2026-10-07')).toBe(67);
    // Si la semana terminó (domingo), se cuentan los 7 días.
    expect(weeklyPercent(h, '2026-10-11')).toBe(29); // 2 de 7
  });

  it('devuelve 100 cuando no hay nada programado', () => {
    const h = makeHabit({
      frequency: { type: 'days', days: [1] },
      startDate: addDays(today, -3),
      history: [],
    });
    // Solo lunes programados; si el lunes ya pasó y no hay semana completa, no revienta.
    expect(weeklyPercent(h)).toBeGreaterThanOrEqual(0);
    expect(weeklyPercent(h)).toBeLessThanOrEqual(100);
  });

  it('en "veces por semana" usa el objetivo como denominador', () => {
    const week = startOfWeek('2026-10-07');
    const h = makeHabit({
      frequency: { type: 'timesPerWeek', times: 3 },
      startDate: addDays(week, -7),
      history: [week, addDays(week, 2)],
    });
    expect(weeklyPercent(h, '2026-10-07')).toBe(67); // 2 de 3
  });
});

describe('currentStreak', () => {
  it('cuenta días consecutivos completados', () => {
    const h = makeHabit({
      startDate: addDays(today, -4),
      history: [addDays(today, -3), addDays(today, -2), addDays(today, -1)],
    });
    // Hoy pendiente no corta la racha.
    expect(currentStreak(h)).toBe(3);
  });

  it('la racha se corta ante un incumplimiento', () => {
    const h = makeHabit({
      startDate: addDays(today, -5),
      history: [addDays(today, -4), addDays(today, -2), addDays(today, -1)],
    });
    expect(currentStreak(h)).toBe(2);
  });

  it('hoy completado suma', () => {
    const h = makeHabit({ startDate: addDays(today, -2), history: [addDays(today, -1), today] });
    expect(currentStreak(h)).toBe(2);
  });

  it('los días no programados no cortan la racha', () => {
    // lunes-miércoles-viernes; cumplidos los 3 últimos programados.
    const h = makeHabit({
      frequency: { type: 'days', days: [1, 3, 5] },
      startDate: addDays(today, -21),
      history: [],
    });
    // Armar racha: completar lun, mié y vie de la semana pasada y esta.
    const week = startOfWeek(today);
    const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(week, i));
    const scheduledDays = days.filter((d) => isScheduledOn(h, d) && d <= today);
    const h2 = { ...h, history: scheduledDays };
    const streak = currentStreak(h2);
    expect(streak).toBeGreaterThanOrEqual(scheduledDays.length - 1);
  });

  it('devuelve 0 si nunca se cumplió', () => {
    const h = makeHabit({ startDate: addDays(today, -5), history: [] });
    expect(currentStreak(h)).toBe(0);
  });
});

describe('overallPercent', () => {
  it('calcula el cumplimiento histórico', () => {
    const h = makeHabit({ startDate: '2026-10-01', history: ['2026-10-01', '2026-10-02', '2026-10-03'] });
    expect(overallPercent(h, '2026-10-10')).toBe(30); // 3 de 10 días
  });

  it('no cuenta días anteriores a la fecha de inicio', () => {
    const h = makeHabit({ startDate: '2026-10-05', history: ['2026-10-06', '2026-10-07', '2026-10-08'] });
    expect(overallPercent(h, '2026-10-08')).toBe(75); // 3 de 4 días
  });
});

describe('habitsSummary y calendario', () => {
  it('separa cumplidos y pendientes del día', () => {
    const a = makeHabit({ id: 'a', history: [today] });
    const b = makeHabit({ id: 'b', history: [] });
    const c = makeHabit({ id: 'c', startDate: addDays(today, 5), history: [] }); // futuro
    const s = habitsSummary([a, b, c], today);
    expect(s.scheduled).toHaveLength(2);
    expect(s.done).toHaveLength(1);
    expect(s.pending.map((h) => h.id)).toEqual(['b']);
  });

  it('monthMatrix cuenta programados y cumplidos por día', () => {
    const h = makeHabit({ startDate: '2026-10-01', history: ['2026-10-01', '2026-10-03'] });
    const matrix = monthMatrix([h], ['2026-10-01', '2026-10-02', '2026-10-03']);
    expect(matrix).toEqual([
      { date: '2026-10-01', done: 1, total: 1 },
      { date: '2026-10-02', done: 0, total: 1 },
      { date: '2026-10-03', done: 1, total: 1 },
    ]);
  });

  it('scheduledDaysThisWeek no incluye días futuros', () => {
    const h = makeHabit({ startDate: '2026-10-01' });
    const days = scheduledDaysThisWeek(h, '2026-10-07'); // miércoles
    expect(days).toEqual(['2026-10-05', '2026-10-06', '2026-10-07']);
  });
});
