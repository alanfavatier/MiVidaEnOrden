import { describe, it, expect } from 'vitest';
import {
  addDays,
  addMonthsKey,
  daysOfMonth,
  diffDays,
  endOfMonth,
  formatISO,
  isValidISO,
  isValidTime,
  monthKey,
  startOfMonth,
  startOfWeek,
  todayISO,
  toISO,
  weekDays,
} from './dates';

describe('dates', () => {
  it('formatea fechas como DD/MM/AAAA', () => {
    expect(formatISO('2026-10-09')).toBe('09/10/2026');
    expect(formatISO('2026-01-05')).toBe('05/01/2026');
    expect(formatISO(null)).toBe('—');
    expect(formatISO('no-es-fecha')).toBe('—');
  });

  it('convierte ISO <-> Date de forma consistente', () => {
    const iso = '2026-03-15';
    expect(toISO(new Date(2026, 2, 15))).toBe(iso);
  });

  it('suma y resta días cruzando meses y años', () => {
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29'); // bisiesto
  });

  it('calcula diferencias en días', () => {
    expect(diffDays('2026-01-01', '2026-01-11')).toBe(10);
    expect(diffDays('2026-01-11', '2026-01-01')).toBe(-10);
    expect(diffDays('2026-01-01', '2026-01-01')).toBe(0);
    expect(diffDays('2026-03-01', '2026-03-31')).toBe(30);
  });

  it('el lunes inicia la semana', () => {
    // 2026-10-10 es sábado; la semana arranca el lunes 05/10.
    expect(startOfWeek('2026-10-10')).toBe('2026-10-05');
    // 2026-10-12 es lunes: su semana es ella misma.
    expect(startOfWeek('2026-10-12')).toBe('2026-10-12');
    // Domingo pertenece a la semana que empezó el lunes anterior.
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05');
    const week = weekDays('2026-10-10');
    expect(week).toHaveLength(7);
    expect(week[0]).toBe('2026-10-05');
    expect(week[6]).toBe('2026-10-11');
  });

  it('calcula límites de mes y claves de mes', () => {
    expect(startOfMonth('2026-10-10')).toBe('2026-10-01');
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
    expect(endOfMonth('2024-02-10')).toBe('2024-02-29');
    expect(monthKey('2026-10-10')).toBe('2026-10');
    expect(addMonthsKey('2026-01', -1)).toBe('2025-12');
    expect(addMonthsKey('2026-12', 1)).toBe('2027-01');
    expect(addMonthsKey('2026-10', -2)).toBe('2026-08');
  });

  it('lista los días de un mes', () => {
    const days = daysOfMonth('2026-02');
    expect(days).toHaveLength(28);
    expect(days[0]).toBe('2026-02-01');
    expect(days[27]).toBe('2026-02-28');
    expect(daysOfMonth('2026-10')).toHaveLength(31);
  });

  it('valida fechas y horas', () => {
    expect(isValidISO('2026-10-10')).toBe(true);
    expect(isValidISO('2026-13-01')).toBe(false);
    expect(isValidISO('2026-02-30')).toBe(false);
    expect(isValidISO('10/10/2026')).toBe(false);
    expect(isValidISO(20261010)).toBe(false);
    expect(isValidTime('09:30')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('9:3')).toBe(false);
  });

  it('todayISO devuelve el formato correcto', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
