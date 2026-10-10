// Pruebas del módulo de almacenamiento con un localStorage simulado.

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  clearAllData,
  isStorageAvailable,
  loadAllData,
  persist,
  readJSON,
  readList,
  removeKey,
  STORAGE_KEYS,
  StorageError,
  isValidHabit,
  isValidTransaction,
  isValidPreferences,
  DEFAULT_PREFERENCES,
} from './storage';
import { createSeedHabits, createSeedGoals } from './seed';

function installLocalStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
  vi.stubGlobal('window', { localStorage });
  return { store, localStorage };
}

describe('storage', () => {
  beforeEach(() => {
    installLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detecta disponibilidad de localStorage', () => {
    expect(isStorageAvailable()).toBe(true);
  });

  it('guarda y recupera JSON', () => {
    persist('mvo:test', { a: 1 });
    expect(readJSON('mvo:test', { a: 0 })).toEqual({ a: 1 });
    expect(readJSON('mvo:inexistente', 'fallback')).toBe('fallback');
  });

  it('no revienta con JSON corrupto: devuelve el fallback', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    (window as unknown as { localStorage: { setItem: (k: string, v: string) => void } }).localStorage.setItem(
      'mvo:roto',
      '{no es json',
    );
    expect(readJSON('mvo:roto', 'ok')).toBe('ok');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('readList descarta elementos inválidos', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    persist('mvo:lista', [{ id: 1, name: 2 }, 'basura', null]);
    expect(readList('mvo:lista', isValidHabit)).toEqual([]);
    warn.mockRestore();
  });

  it('readList devuelve [] si no es una lista', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    persist('mvo:lista2', { no: 'es lista' });
    expect(readList('mvo:lista2', isValidHabit)).toEqual([]);
    warn.mockRestore();
  });

  it('lanza StorageError cuando la escritura falla', () => {
    const w = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => persist('mvo:full', [1, 2, 3])).toThrow(StorageError);
    w.mockRestore();
    err.mockRestore();
  });

  it('elimina claves', () => {
    persist('mvo:borrar', 1);
    removeKey('mvo:borrar');
    expect(readJSON('mvo:borrar', null)).toBeNull();
  });

  it('clearAllData elimina todas las claves de la app', () => {
    persist(STORAGE_KEYS.habits, createSeedHabits());
    persist(STORAGE_KEYS.goals, createSeedGoals());
    persist(STORAGE_KEYS.preferences, { theme: 'light', name: 'X' });
    clearAllData();
    const data = loadAllData();
    expect(data.habits).toEqual([]);
    expect(data.goals).toEqual([]);
    expect(data.preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('loadAllData carga y valida cada sección', () => {
    persist(STORAGE_KEYS.habits, createSeedHabits());
    persist(STORAGE_KEYS.tasks, [
      { id: 't1', title: 'x', date: '2026-10-10', category: 'Estudio', done: false },
      { id: 99 },
    ]);
    persist(STORAGE_KEYS.transactions, [
      { id: 'x', type: 'ingreso', amount: 100, date: '2026-10-01', description: 'd', category: 'Otros ingresos' },
      { id: 'y', type: 'gasto', amount: -5, date: '2026-10-01', description: 'd', category: 'Comida' },
    ]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const data = loadAllData();
    expect(data.habits).toHaveLength(10);
    expect(data.tasks).toHaveLength(1);
    expect(data.transactions).toHaveLength(1);
    warn.mockRestore();
  });

  it('los datos persisten entre "recargas" (mismo almacenamiento)', () => {
    persist(STORAGE_KEYS.habits, createSeedHabits());
    // Simula recargar: se vuelve a leer desde el mismo store.
    const again = loadAllData();
    expect(again.habits).toHaveLength(10);
    expect(again.habits[0].history).toEqual([]);
  });

  it('isValidTransaction rechaza importes negativos y tipos desconocidos', () => {
    const base = { id: 'a', amount: 10, date: '2026-10-01', description: 'd', category: 'x' };
    expect(isValidTransaction({ ...base, type: 'ingreso' })).toBe(true);
    expect(isValidTransaction({ ...base, type: 'gasto' })).toBe(true);
    expect(isValidTransaction({ ...base, type: 'transferencia' })).toBe(false);
    expect(isValidTransaction({ ...base, type: 'gasto', amount: -1 })).toBe(false);
    expect(isValidTransaction({ ...base, type: 'gasto', amount: '10' })).toBe(false);
    expect(isValidTransaction(null)).toBe(false);
  });

  it('isValidPreferences acepta los tres temas y rechaza otros valores', () => {
    expect(isValidPreferences({ theme: 'dark', name: '' })).toBe(true);
    expect(isValidPreferences({ theme: 'light', name: 'Alan' })).toBe(true);
    expect(isValidPreferences({ theme: 'pink', name: '' })).toBe(true);
    expect(isValidPreferences({ theme: 'blue', name: '' })).toBe(false);
    expect(isValidPreferences({ theme: 1, name: '' })).toBe(false);
    expect(isValidPreferences({ theme: 'dark', name: 5 })).toBe(false);
    expect(isValidPreferences(null)).toBe(false);
  });

  it('loadAllData conserva el tema rosa guardado', () => {
    persist(STORAGE_KEYS.preferences, { theme: 'pink', name: 'Ana' });
    const data = loadAllData();
    expect(data.preferences.theme).toBe('pink');
    expect(data.preferences.name).toBe('Ana');
  });
});
