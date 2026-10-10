// Módulo de almacenamiento local (localStorage).
// Claves consistentes, validación de datos y manejo de errores.

import type { AppData, Preferences, Challenge, Habit, Goal, Task, RoutineEntry, Transaction, SavingsGoal } from '../types';

export const STORAGE_PREFIX = 'mvo:';

export const STORAGE_KEYS = {
  habits: `${STORAGE_PREFIX}habits`,
  goals: `${STORAGE_PREFIX}goals`,
  tasks: `${STORAGE_PREFIX}tasks`,
  routines: `${STORAGE_PREFIX}routines`,
  transactions: `${STORAGE_PREFIX}transactions`,
  savingsGoals: `${STORAGE_PREFIX}savings-goals`,
  challenge: `${STORAGE_PREFIX}challenge`,
  preferences: `${STORAGE_PREFIX}preferences`,
} as const;

export const BACKUP_VERSION = 1;

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  name: '',
};

export const DEFAULT_CHALLENGE: Challenge = {
  startDate: null,
  totalDays: 60,
  habitIds: [],
  notes: '',
};

export class StorageError extends Error {}

/** ¿Está disponible localStorage en este entorno? */
export function isStorageAvailable(): boolean {
  try {
    const k = `${STORAGE_PREFIX}__test__`;
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lee una clave y la parsea. Devuelve `fallback` si la clave no existe,
 * está vacía o el contenido no es JSON válido.
 */
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[storage] No se pudo leer "${key}":`, err);
    return fallback;
  }
}

/** Escribe un valor como JSON. Lanza StorageError si falla (por ejemplo, cuota llena). */
export function writeJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[storage] No se pudo guardar "${key}":`, err);
    throw new StorageError(
      'No se pudieron guardar los datos. El almacenamiento del navegador puede estar lleno o bloqueado.',
    );
  }
}

/** Elimina una clave. */
export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[storage] No se pudo eliminar "${key}":`, err);
  }
}

/** Lee una lista con validación: si el contenido no es un array, devuelve []. */
export function readList<T>(key: string, validateItem: (v: unknown) => v is T): T[] {
  const raw = readJSON<unknown>(key, []);
  if (!Array.isArray(raw)) {
    console.warn(`[storage] "${key}" no contenía una lista; se reinicia.`);
    return [];
  }
  const out: T[] = [];
  for (const item of raw) {
    if (validateItem(item)) out.push(item);
    else console.warn(`[storage] Elemento inválido descartado en "${key}".`);
  }
  return out;
}

// ---------- Validaciones de dominio ----------

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);

export function isValidHabit(v: unknown): v is Habit {
  if (!isObj(v)) return false;
  if (!isStr(v.id) || !isStr(v.name) || !isStr(v.startDate)) return false;
  if (!isObj(v.frequency)) return false;
  const f = v.frequency as Record<string, unknown>;
  if (f.type === 'daily') {
    // ok
  } else if (f.type === 'days') {
    if (!Array.isArray(f.days) || !f.days.every((d) => typeof d === 'number' && d >= 0 && d <= 6))
      return false;
  } else if (f.type === 'timesPerWeek') {
    if (typeof f.times !== 'number' || f.times < 1 || f.times > 7) return false;
  } else return false;
  if (!isStrArr(v.history)) return false;
  return true;
}

export function isValidGoal(v: unknown): v is Goal {
  if (!isObj(v)) return false;
  if (!isStr(v.id) || !isStr(v.title) || !isStr(v.category) || !isStr(v.status)) return false;
  if (!Array.isArray(v.steps)) return false;
  if (typeof v.progress !== 'number') return false;
  return true;
}

export function isValidTask(v: unknown): v is Task {
  if (!isObj(v)) return false;
  if (!isStr(v.id) || !isStr(v.title) || !isStr(v.date) || !isStr(v.category)) return false;
  if (typeof v.done !== 'boolean') return false;
  return true;
}

export function isValidRoutineEntry(v: unknown): v is RoutineEntry {
  if (!isObj(v)) return false;
  if (!isStr(v.id) || !isStr(v.title) || !isStr(v.category)) return false;
  if (typeof v.weekday !== 'number' || v.weekday < 0 || v.weekday > 6) return false;
  return true;
}

export function isValidTransaction(v: unknown): v is Transaction {
  if (!isObj(v)) return false;
  if (!isStr(v.id) || !isStr(v.date) || !isStr(v.description) || !isStr(v.category)) return false;
  if (v.type !== 'ingreso' && v.type !== 'gasto') return false;
  if (typeof v.amount !== 'number' || !Number.isFinite(v.amount) || v.amount < 0) return false;
  return true;
}

export function isValidSavingsGoal(v: unknown): v is SavingsGoal {
  if (!isObj(v)) return false;
  if (!isStr(v.id) || !isStr(v.title)) return false;
  if (typeof v.target !== 'number' || typeof v.saved !== 'number') return false;
  return true;
}

export function isValidChallenge(v: unknown): v is Challenge {
  if (!isObj(v)) return false;
  if (v.startDate !== null && !isStr(v.startDate)) return false;
  if (typeof v.totalDays !== 'number') return false;
  if (!isStrArr(v.habitIds)) return false;
  if (!isStr(v.notes)) return false;
  return true;
}

export function isValidPreferences(v: unknown): v is Preferences {
  if (!isObj(v)) return false;
  if (v.theme !== 'dark' && v.theme !== 'light') return false;
  if (!isStr(v.name)) return false;
  return true;
}

// ---------- Carga completa ----------

/** Carga todos los datos del usuario desde localStorage. */
export function loadAllData(): AppData {
  if (!isStorageAvailable()) {
    console.warn('[storage] localStorage no disponible: los datos no se conservarán.');
  }
  return {
    habits: readList(STORAGE_KEYS.habits, isValidHabit),
    goals: readList(STORAGE_KEYS.goals, isValidGoal),
    tasks: readList(STORAGE_KEYS.tasks, isValidTask),
    routines: readList(STORAGE_KEYS.routines, isValidRoutineEntry),
    transactions: readList(STORAGE_KEYS.transactions, isValidTransaction),
    savingsGoals: readList(STORAGE_KEYS.savingsGoals, isValidSavingsGoal),
    challenge: readJSON<Challenge>(STORAGE_KEYS.challenge, DEFAULT_CHALLENGE),
    preferences: readJSON<Preferences>(STORAGE_KEYS.preferences, DEFAULT_PREFERENCES),
  };
}

/** Persiste una parte concreta de los datos. */
export function persist(key: string, value: unknown): void {
  writeJSON(key, value);
}

/** Elimina todos los datos de la aplicación (no borra cachés del Service Worker). */
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(removeKey);
}
