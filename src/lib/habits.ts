// Lógica de hábitos: programación, historial, rachas y porcentajes.

import type { Habit } from '../types';
import { addDays, diffDays, startOfWeek, todayISO, weekdayOf, weekDays } from './dates';

/** ¿Tiene el hábito programado ese día? */
export function isScheduledOn(habit: Habit, iso: string): boolean {
  if (diffDays(habit.startDate, iso) < 0) return false; // antes de la fecha de inicio
  const f = habit.frequency;
  if (f.type === 'daily') return true;
  if (f.type === 'days') return f.days.includes(weekdayOf(iso));
  if (f.type === 'timesPerWeek') {
    // flexible: cualquier día de la semana cuenta hasta completar las "times" veces
    return true;
  }
  return false;
}

/** ¿Está marcado como completado ese día? */
export function isDoneOn(habit: Habit, iso: string): boolean {
  return habit.history.includes(iso);
}

/**
 * Días programados de la semana (lunes a domingo) que ya pasaron o son hoy,
 * dentro de la semana que contiene a `iso`.
 */
export function scheduledDaysThisWeek(habit: Habit, iso = todayISO()): string[] {
  const week = weekDays(iso);
  const today = iso;
  return week.filter((d) => isScheduledOn(habit, d) && diffDays(d, today) >= 0);
}

/**
 * Porcentaje de cumplimiento semanal (lunes a domingo) del hábito.
 * Solo cuenta los días ya transcurridos de la semana, para no penalizar
 * días que todavía no sucedieron.
 * Para frecuencia "veces por semana", el objetivo es la cantidad indicada.
 */
export function weeklyPercent(habit: Habit, iso = todayISO()): number {
  const week = weekDays(iso);
  if (habit.frequency.type === 'timesPerWeek') {
    const target = Math.max(1, habit.frequency.times);
    const done = week.filter((d) => d <= iso && isDoneOn(habit, d)).length;
    return Math.min(100, Math.round((done / target) * 100));
  }
  const scheduled = week.filter((d) => isScheduledOn(habit, d) && d <= iso);
  if (scheduled.length === 0) return 100;
  const done = scheduled.filter((d) => isDoneOn(habit, d)).length;
  return Math.round((done / scheduled.length) * 100);
}

/** Porcentaje de cumplimiento histórico (desde la fecha de inicio). */
export function overallPercent(habit: Habit, iso = todayISO()): number {
  const total = diffDays(habit.startDate, iso) + 1;
  if (total <= 0) return 0;
  const done = habit.history.filter((d) => diffDays(habit.startDate, d) >= 0 && diffDays(d, iso) >= 0).length;
  return Math.min(100, Math.round((done / total) * 100));
}

/**
 * Racha actual en días: días programados consecutivos completados,
 * empezando por hoy (o por ayer si hoy todavía no se completó).
 * Devuelve 0 cuando no corresponde llevar racha.
 */
export function currentStreak(habit: Habit, iso = todayISO()): number {
  if (habit.frequency.type === 'timesPerWeek') {
    // La racha aplica a hábitos con día concreto; para "veces por semana"
    // devolvemos la semana consecutiva cumplida.
    return streakWeeks(habit, iso);
  }
  let cursor = iso;
  if (isScheduledOn(habit, cursor) && !isDoneOn(habit, cursor)) {
    cursor = addDays(cursor, -1); // hoy pendiente no corta la racha todavía
  }
  let streak = 0;
  const max = 3650;
  for (let i = 0; i < max; i++) {
    if (diffDays(habit.startDate, cursor) < 0) break;
    if (isScheduledOn(habit, cursor)) {
      if (isDoneOn(habit, cursor)) {
        streak++;
        cursor = addDays(cursor, -1);
      } else {
        break;
      }
    } else {
      cursor = addDays(cursor, -1); // días no programados no cortan
    }
  }
  return streak;
}

/** Semanas consecutivas cumplidas con el objetivo "veces por semana". */
function streakWeeks(habit: Habit, iso: string): number {
  const target = Math.max(1, habit.frequency.type === 'timesPerWeek' ? habit.frequency.times : 1);
  let start = startOfWeek(iso);
  let streak = 0;
  for (let i = 0; i < 260; i++) {
    const days = weekDays(start);
    const valid = days.filter((d) => diffDays(habit.startDate, d) >= 0 && diffDays(d, iso) <= 0);
    if (valid.length === 0) break;
    const done = valid.filter((d) => isDoneOn(habit, d)).length;
    const isCurrentWeek = start === startOfWeek(iso);
    if (done >= target) {
      streak++;
    } else if (isCurrentWeek) {
      // La semana en curso todavía puede completarse.
    } else {
      break;
    }
    start = addDays(start, -7);
  }
  return streak;
}

/** Marca o desmarca la completitud de un hábito en una fecha. Devuelve el hábito nuevo. */
export function toggleHabitOn(habit: Habit, iso: string): Habit {
  const has = habit.history.includes(iso);
  const history = has ? habit.history.filter((d) => d !== iso) : [...habit.history, iso].sort();
  return { ...habit, history };
}

/** Resumen de hábitos para una fecha. */
export function habitsSummary(habits: Habit[], iso: string): {
  scheduled: Habit[];
  done: Habit[];
  pending: Habit[];
} {
  const scheduled = habits.filter((h) => isScheduledOn(h, iso));
  const done = scheduled.filter((h) => isDoneOn(h, iso));
  const pending = scheduled.filter((h) => !isDoneOn(h, iso));
  return { scheduled, done, pending };
}

/**
 * Matriz del mes: para cada día, cuántos hábitos programados se cumplieron
 * sobre el total programados. Usada por el calendario visual.
 */
export function monthMatrix(habits: Habit[], days: string[]): { date: string; done: number; total: number }[] {
  return days.map((date) => {
    const total = habits.filter((h) => isScheduledOn(h, date)).length;
    const done = habits.filter((h) => isScheduledOn(h, date) && isDoneOn(h, date)).length;
    return { date, done, total };
  });
}
