// Lógica de objetivos: progreso, filtros y desafío de 60 días.

import type { Goal, Habit, GoalCategory, GoalStatus } from '../types';
import { diffDays, todayISO } from './dates';

/** Progreso de un objetivo: derivado de los pasos si los hay, si no, el manual. */
export function goalProgress(goal: Goal): number {
  if (goal.steps.length > 0) {
    const done = goal.steps.filter((s) => s.done).length;
    return Math.round((done / goal.steps.length) * 100);
  }
  return clampPercent(goal.progress);
}

export function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Cuenta de pasos completados. */
export function stepsDone(goal: Goal): { done: number; total: number } {
  return { done: goal.steps.filter((s) => s.done).length, total: goal.steps.length };
}

/** Objetivos ordenados por prioridad y luego por fecha límite. */
export function sortGoals(goals: Goal[]): Goal[] {
  const rank: Record<string, number> = { alta: 0, media: 1, baja: 2 };
  return [...goals].sort((a, b) => {
    const ra = rank[a.priority] ?? 3;
    const rb = rank[b.priority] ?? 3;
    if (ra !== rb) return ra - rb;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.title.localeCompare(b.title, 'es');
  });
}

/** Progreso promedio de los objetivos activos (no completados). */
export function averageProgress(goals: Goal[]): number {
  const active = goals.filter((g) => g.status !== 'completado');
  if (active.length === 0) {
    const done = goals.filter((g) => g.status === 'completado');
    return done.length > 0 ? 100 : 0;
  }
  const sum = active.reduce((acc, g) => acc + goalProgress(g), 0);
  return Math.round(sum / active.length);
}

export const GOAL_CATEGORIES: GoalCategory[] = [
  'Salud y cuidado personal',
  'Carrera y tecnología',
  'Dinero y compras',
  'Hogar',
  'Aprendizaje personal',
  'Organización',
  'Otra',
];

export const GOAL_STATUSES: GoalStatus[] = ['pendiente', 'en progreso', 'completado'];

/** Estado derivado según fechas y progreso (solo sugiere, no cambia el dato). */
export function isOverdue(goal: Goal, iso = todayISO()): boolean {
  if (goal.status === 'completado' || !goal.dueDate) return false;
  return diffDays(goal.dueDate, iso) > 0;
}

// ---------- Desafío de 60 días ----------

export interface ChallengeInfo {
  active: boolean;
  currentDay: number;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  remaining: number;
}

/**
 * Calcula el estado del desafío físico.
 * No garantiza resultados: solo muestra en qué día vas según la fecha elegida.
 */
export function challengeInfo(
  challenge: { startDate: string | null; totalDays: number },
  iso = todayISO(),
): ChallengeInfo {
  const total = Math.max(1, challenge.totalDays || 60);
  if (!challenge.startDate) {
    return { active: false, currentDay: 0, progress: 0, startDate: null, endDate: null, remaining: total };
  }
  const elapsed = diffDays(challenge.startDate, iso) + 1; // día 1 el día de inicio
  const currentDay = Math.max(0, Math.min(total, elapsed));
  const progress = Math.round((currentDay / total) * 100);
  const startDate = challenge.startDate;
  const endDate = null; // se calcula fuera para no requerir addDays aquí
  return {
    active: elapsed >= 1,
    currentDay,
    progress,
    startDate,
    endDate,
    remaining: Math.max(0, total - currentDay),
  };
}

/** Hábitos asociados al desafío. */
export function challengeHabits(habits: Habit[], habitIds: string[]): Habit[] {
  return habitIds.map((id) => habits.find((h) => h.id === id)).filter((h): h is Habit => Boolean(h));
}
