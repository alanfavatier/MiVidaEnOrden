// Estado global de la aplicación con persistencia en localStorage.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppData,
  Challenge,
  Goal,
  Habit,
  Preferences,
  RoutineEntry,
  SavingsGoal,
  Task,
  Transaction,
} from '../types';
import {
  DEFAULT_CHALLENGE,
  DEFAULT_PREFERENCES,
  STORAGE_KEYS,
  clearAllData,
  loadAllData,
  persist,
} from '../lib/storage';
import { createSeedGoals, createSeedHabits, uid } from '../lib/seed';
import { goalProgress, clampPercent } from '../lib/goals';
import type { BackupFile } from '../types';
import { parseBackupText } from '../lib/backup';

interface StoreValue {
  data: AppData;
  ready: boolean;
  /** Mensaje de error/aviso no bloqueante (ej.: falló la escritura). */
  notice: string | null;
  clearNotice: () => void;

  // Hábitos
  addHabit: (h: Omit<Habit, 'id' | 'createdAt' | 'history'>) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabit: (id: string, date: string) => void;

  // Objetivos
  addGoal: (g: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  // Tareas
  addTask: (t: Omit<Task, 'id' | 'createdAt' | 'done'>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  rescheduleTask: (id: string, date: string) => void;

  // Rutina semanal
  addRoutine: (r: Omit<RoutineEntry, 'id'>) => void;
  updateRoutine: (id: string, patch: Partial<RoutineEntry>) => void;
  deleteRoutine: (id: string) => void;
  generateTasksFromRoutine: (weekStart: string) => number;

  // Finanzas
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Objetivos de ahorro
  addSavingsGoal: (g: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSavingsGoal: (id: string, patch: Partial<SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;

  // Desafío
  updateChallenge: (patch: Partial<Challenge>) => void;

  // Preferencias
  updatePreferences: (patch: Partial<Preferences>) => void;

  // Datos
  clearAll: () => void;
  loadSeedData: () => void;
  importBackup: (text: string) => Record<string, number>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de <StoreProvider>');
  return ctx;
}

function firstRun(data: AppData): boolean {
  return (
    data.habits.length === 0 &&
    data.goals.length === 0 &&
    data.tasks.length === 0 &&
    data.transactions.length === 0
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadAllData());
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const hydrated = useRef(false);

  // Primera ejecución: cargar hábitos y objetivos sugeridos (sin fechas ni progreso inventados).
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    if (firstRun(data)) {
      const seeded: AppData = {
        ...data,
        habits: createSeedHabits(),
        goals: createSeedGoals(),
        challenge: { ...DEFAULT_CHALLENGE },
      };
      setData(seeded);
      saveAll(seeded);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveAll(d: AppData): void {
    try {
      persist(STORAGE_KEYS.habits, d.habits);
      persist(STORAGE_KEYS.goals, d.goals);
      persist(STORAGE_KEYS.tasks, d.tasks);
      persist(STORAGE_KEYS.routines, d.routines);
      persist(STORAGE_KEYS.transactions, d.transactions);
      persist(STORAGE_KEYS.savingsGoals, d.savingsGoals);
      persist(STORAGE_KEYS.challenge, d.challenge);
      persist(STORAGE_KEYS.preferences, d.preferences);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'No se pudieron guardar los datos.');
    }
  }

  /** Persiste un conjunto concreto de claves tras cada cambio. */
  const persistKeys = useCallback((d: AppData, keys: (keyof typeof STORAGE_KEYS)[]) => {
    try {
      for (const k of keys) {
        const key = STORAGE_KEYS[k];
        const value = d[k === 'savingsGoals' ? 'savingsGoals' : k];
        persist(key, value);
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'No se pudieron guardar los datos.');
    }
  }, []);

  const patch = useCallback(
    (fn: (d: AppData) => AppData, keys: (keyof typeof STORAGE_KEYS)[]) => {
      setData((prev) => {
        const next = fn(prev);
        persistKeys(next, keys);
        return next;
      });
    },
    [persistKeys],
  );

  // ---------- Hábitos ----------
  const addHabit: StoreValue['addHabit'] = useCallback(
    (h) =>
      patch(
        (d) => ({
          ...d,
          habits: [...d.habits, { ...h, id: uid(), history: [], createdAt: new Date().toISOString() }],
        }),
        ['habits'],
      ),
    [patch],
  );

  const updateHabit: StoreValue['updateHabit'] = useCallback(
    (id, p) =>
      patch((d) => ({ ...d, habits: d.habits.map((h) => (h.id === id ? { ...h, ...p } : h)) }), ['habits']),
    [patch],
  );

  const deleteHabit: StoreValue['deleteHabit'] = useCallback(
    (id) =>
      patch(
        (d) => ({
          ...d,
          habits: d.habits.filter((h) => h.id !== id),
          challenge: { ...d.challenge, habitIds: d.challenge.habitIds.filter((x) => x !== id) },
        }),
        ['habits', 'challenge'],
      ),
    [patch],
  );

  const toggleHabit: StoreValue['toggleHabit'] = useCallback(
    (id, date) =>
      patch(
        (d) => ({
          ...d,
          habits: d.habits.map((h) =>
            h.id === id
              ? {
                  ...h,
                  history: h.history.includes(date)
                    ? h.history.filter((x) => x !== date)
                    : [...h.history, date].sort(),
                }
              : h,
          ),
        }),
        ['habits'],
      ),
    [patch],
  );

  // ---------- Objetivos ----------
  const addGoal: StoreValue['addGoal'] = useCallback(
    (g) =>
      patch(
        (d) => {
          const now = new Date().toISOString();
          const goal: Goal = { ...g, id: uid(), createdAt: now, updatedAt: now };
          // Si el progreso manual era 0 y tiene pasos, se deriva de ellos.
          goal.progress = goalProgress(goal);
          return { ...d, goals: [...d.goals, goal] };
        },
        ['goals'],
      ),
    [patch],
  );

  const updateGoal: StoreValue['updateGoal'] = useCallback(
    (id, p) =>
      patch(
        (d) => ({
          ...d,
          goals: d.goals.map((g) => {
            if (g.id !== id) return g;
            const next: Goal = { ...g, ...p, updatedAt: new Date().toISOString() };
            if (p.steps || p.progress !== undefined) {
              next.progress = p.steps ? goalProgress(next) : clampPercent(next.progress);
            }
            if (next.steps.length > 0) next.progress = goalProgress(next);
            if (next.status === 'completado') next.progress = 100;
            return next;
          }),
        }),
        ['goals'],
      ),
    [patch],
  );

  const deleteGoal: StoreValue['deleteGoal'] = useCallback(
    (id) => patch((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }), ['goals']),
    [patch],
  );

  // ---------- Tareas ----------
  const addTask: StoreValue['addTask'] = useCallback(
    (t) =>
      patch(
        (d) => ({ ...d, tasks: [...d.tasks, { ...t, id: uid(), done: false, createdAt: new Date().toISOString() }] }),
        ['tasks'],
      ),
    [patch],
  );

  const updateTask: StoreValue['updateTask'] = useCallback(
    (id, p) => patch((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...p } : t)) }), ['tasks']),
    [patch],
  );

  const deleteTask: StoreValue['deleteTask'] = useCallback(
    (id) => patch((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }), ['tasks']),
    [patch],
  );

  const toggleTask: StoreValue['toggleTask'] = useCallback(
    (id) =>
      patch(
        (d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }),
        ['tasks'],
      ),
    [patch],
  );

  const rescheduleTask: StoreValue['rescheduleTask'] = useCallback(
    (id, date) =>
      patch(
        (d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, date, done: false } : t)) }),
        ['tasks'],
      ),
    [patch],
  );

  // ---------- Rutina semanal ----------
  const addRoutine: StoreValue['addRoutine'] = useCallback(
    (r) => patch((d) => ({ ...d, routines: [...d.routines, { ...r, id: uid() }] }), ['routines']),
    [patch],
  );

  const updateRoutine: StoreValue['updateRoutine'] = useCallback(
    (id, p) => patch((d) => ({ ...d, routines: d.routines.map((r) => (r.id === id ? { ...r, ...p } : r)) }), ['routines']),
    [patch],
  );

  const deleteRoutine: StoreValue['deleteRoutine'] = useCallback(
    (id) => patch((d) => ({ ...d, routines: d.routines.filter((r) => r.id !== id) }), ['routines']),
    [patch],
  );

  const generateTasksFromRoutine: StoreValue['generateTasksFromRoutine'] = useCallback(
    (weekStart) => {
      let created = 0;
      setData((prev) => {
        const tasks = [...prev.tasks];
        const now = new Date().toISOString();
        for (const entry of prev.routines) {
          // weekStart es lunes; weekday 0 = domingo => lunes es 1.
          const offset = entry.weekday === 0 ? 6 : entry.weekday - 1;
          const d = new Date(weekStart);
          d.setDate(d.getDate() + offset);
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const exists = tasks.some((t) => t.date === iso && t.title.trim() === entry.title.trim());
          if (!exists) {
            tasks.push({
              id: uid(),
              title: entry.title,
              date: iso,
              time: entry.time,
              duration: entry.duration,
              category: entry.category,
              done: false,
              notes: '',
              createdAt: now,
            });
            created++;
          }
        }
        const next = { ...prev, tasks };
        try {
          persist(STORAGE_KEYS.tasks, next.tasks);
        } catch (err) {
          setNotice(err instanceof Error ? err.message : 'No se pudieron guardar las tareas.');
        }
        return next;
      });
      return created;
    },
    [],
  );

  // ---------- Finanzas ----------
  const addTransaction: StoreValue['addTransaction'] = useCallback(
    (t) =>
      patch(
        (d) => ({ ...d, transactions: [...d.transactions, { ...t, id: uid(), createdAt: new Date().toISOString() }] }),
        ['transactions'],
      ),
    [patch],
  );

  const updateTransaction: StoreValue['updateTransaction'] = useCallback(
    (id, p) =>
      patch((d) => ({ ...d, transactions: d.transactions.map((t) => (t.id === id ? { ...t, ...p } : t)) }), [
        'transactions',
      ]),
    [patch],
  );

  const deleteTransaction: StoreValue['deleteTransaction'] = useCallback(
    (id) => patch((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }), ['transactions']),
    [patch],
  );

  // ---------- Ahorro ----------
  const addSavingsGoal: StoreValue['addSavingsGoal'] = useCallback(
    (g) =>
      patch(
        (d) => {
          const now = new Date().toISOString();
          return { ...d, savingsGoals: [...d.savingsGoals, { ...g, id: uid(), createdAt: now, updatedAt: now }] };
        },
        ['savingsGoals'],
      ),
    [patch],
  );

  const updateSavingsGoal: StoreValue['updateSavingsGoal'] = useCallback(
    (id, p) =>
      patch(
        (d) => ({
          ...d,
          savingsGoals: d.savingsGoals.map((s) => (s.id === id ? { ...s, ...p, updatedAt: new Date().toISOString() } : s)),
        }),
        ['savingsGoals'],
      ),
    [patch],
  );

  const deleteSavingsGoal: StoreValue['deleteSavingsGoal'] = useCallback(
    (id) => patch((d) => ({ ...d, savingsGoals: d.savingsGoals.filter((s) => s.id !== id) }), ['savingsGoals']),
    [patch],
  );

  // ---------- Desafío ----------
  const updateChallenge: StoreValue['updateChallenge'] = useCallback(
    (p) => patch((d) => ({ ...d, challenge: { ...d.challenge, ...p } }), ['challenge']),
    [patch],
  );

  // ---------- Preferencias ----------
  const updatePreferences: StoreValue['updatePreferences'] = useCallback(
    (p) => patch((d) => ({ ...d, preferences: { ...d.preferences, ...p } }), ['preferences']),
    [patch],
  );

  // ---------- Datos ----------
  const clearAll: StoreValue['clearAll'] = useCallback(() => {
    clearAllData();
    setData({
      habits: [],
      goals: [],
      tasks: [],
      routines: [],
      transactions: [],
      savingsGoals: [],
      challenge: { ...DEFAULT_CHALLENGE },
      preferences: { ...DEFAULT_PREFERENCES },
    });
  }, []);

  const loadSeedData: StoreValue['loadSeedData'] = useCallback(() => {
    patch(
      (d) => ({
        ...d,
        habits: d.habits.length === 0 ? createSeedHabits() : d.habits,
        goals: d.goals.length === 0 ? createSeedGoals() : d.goals,
      }),
      ['habits', 'goals'],
    );
  }, [patch]);

  const importBackup: StoreValue['importBackup'] = useCallback((text: string) => {
    const { data: imported, counts } = parseBackupText(text);
    setData(imported);
    saveAll(imported);
    return counts;
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      data,
      ready,
      notice,
      clearNotice: () => setNotice(null),
      addHabit,
      updateHabit,
      deleteHabit,
      toggleHabit,
      addGoal,
      updateGoal,
      deleteGoal,
      addTask,
      updateTask,
      deleteTask,
      toggleTask,
      rescheduleTask,
      addRoutine,
      updateRoutine,
      deleteRoutine,
      generateTasksFromRoutine,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addSavingsGoal,
      updateSavingsGoal,
      deleteSavingsGoal,
      updateChallenge,
      updatePreferences,
      clearAll,
      loadSeedData,
      importBackup,
    }),
    [
      data,
      ready,
      notice,
      addHabit,
      updateHabit,
      deleteHabit,
      toggleHabit,
      addGoal,
      updateGoal,
      deleteGoal,
      addTask,
      updateTask,
      deleteTask,
      toggleTask,
      rescheduleTask,
      addRoutine,
      updateRoutine,
      deleteRoutine,
      generateTasksFromRoutine,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addSavingsGoal,
      updateSavingsGoal,
      deleteSavingsGoal,
      updateChallenge,
      updatePreferences,
      clearAll,
      loadSeedData,
      importBackup,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export type { BackupFile };
