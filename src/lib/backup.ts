// Copias de seguridad: exportación, importación y validación.

import type { AppData, BackupFile } from '../types';
import {
  BACKUP_VERSION,
  DEFAULT_CHALLENGE,
  DEFAULT_PREFERENCES,
  isValidChallenge,
  isValidPreferences,
  isValidGoal,
  isValidHabit,
  isValidRoutineEntry,
  isValidSavingsGoal,
  isValidTask,
  isValidTransaction,
} from './storage';

export class BackupError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export interface ImportResult {
  data: AppData;
  counts: Record<keyof AppData, number>;
}

/**
 * Valida un archivo de copia de seguridad ya parseado.
 * Lanza BackupError con un mensaje claro si el archivo no sirve.
 */
export function validateBackup(parsed: unknown): ImportResult {
  if (!isObj(parsed)) throw new BackupError('El archivo no contiene un objeto JSON válido.');
  if (parsed.app !== 'mi-vida-en-orden') {
    throw new BackupError('El archivo no es una copia de seguridad de Mi Vida en Orden.');
  }
  if (typeof parsed.version !== 'number' || parsed.version > BACKUP_VERSION) {
    throw new BackupError(
      `La versión del archivo (${String(parsed.version)}) no es compatible con esta aplicación.`,
    );
  }
  const data = parsed.data;
  if (!isObj(data)) throw new BackupError('El archivo no contiene la sección "data".');

  const arr = (key: string): unknown[] => {
    const v = data[key];
    if (v === undefined) return [];
    if (!Array.isArray(v)) throw new BackupError(`La sección "${key}" debe ser una lista.`);
    return v;
  };

  const habits = arr('habits').filter(isValidHabit);
  const goals = arr('goals').filter(isValidGoal);
  const tasks = arr('tasks').filter(isValidTask);
  const routines = arr('routines').filter(isValidRoutineEntry);
  const transactions = arr('transactions').filter(isValidTransaction);
  const savingsGoals = arr('savingsGoals').filter(isValidSavingsGoal);

  const total =
    arr('habits').length +
    arr('goals').length +
    arr('tasks').length +
    arr('routines').length +
    arr('transactions').length +
    arr('savingsGoals').length;
  const valid = habits.length + goals.length + tasks.length + routines.length + transactions.length + savingsGoals.length;
  if (total > 0 && valid === 0) {
    throw new BackupError('El archivo no contiene datos reconocibles de la aplicación.');
  }
  if (valid !== total) {
    console.warn(`[backup] Se ignoraron ${total - valid} registros inválidos.`);
  }

  const challenge = data.challenge !== undefined && isValidChallenge(data.challenge)
    ? data.challenge
    : DEFAULT_CHALLENGE;
  const preferences =
    data.preferences !== undefined && isValidPreferences(data.preferences)
      ? data.preferences
      : DEFAULT_PREFERENCES;

  const result: AppData = { habits, goals, tasks, routines, transactions, savingsGoals, challenge, preferences };

  return {
    data: result,
    counts: {
      habits: habits.length,
      goals: goals.length,
      tasks: tasks.length,
      routines: routines.length,
      transactions: transactions.length,
      savingsGoals: savingsGoals.length,
      challenge: 1,
      preferences: 1,
    },
  };
}

/** Convierte texto de archivo en resultado de importación. */
export function parseBackupText(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupError('El archivo no es un JSON válido. Verificá que sea el archivo exportado por la app.');
  }
  return validateBackup(parsed);
}

/** Construye el objeto de copia de seguridad. */
export function buildBackup(data: AppData): BackupFile {
  return {
    app: 'mi-vida-en-orden',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

/** Genera y descarga el archivo JSON. */
export function downloadBackup(data: AppData): string {
  const backup = buildBackup(data);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `mi-vida-en-orden-${stamp}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return filename;
}
