import { describe, it, expect, vi } from 'vitest';
import { BackupError, buildBackup, parseBackupText, validateBackup } from './backup';
import { createSeedGoals, createSeedHabits } from './seed';
import { BACKUP_VERSION, DEFAULT_CHALLENGE, DEFAULT_PREFERENCES } from './storage';
import type { AppData } from '../types';

function sampleData(): AppData {
  return {
    habits: createSeedHabits(),
    goals: createSeedGoals(),
    tasks: [
      {
        id: 't1',
        title: 'Gimnasio',
        date: '2026-10-10',
        time: '18:00',
        duration: 60,
        category: 'Gimnasio',
        done: false,
        notes: '',
        createdAt: new Date().toISOString(),
      },
    ],
    routines: [
      { id: 'r1', weekday: 1, title: 'Estudiar', time: null, duration: null, category: 'Estudio' },
    ],
    transactions: [
      {
        id: 'x1',
        type: 'ingreso',
        amount: 15000,
        date: '2026-10-01',
        description: 'Reparto de bidones',
        category: 'Reparto y venta de bidones de agua',
        notes: '',
        transfer: false,
        createdAt: new Date().toISOString(),
      },
    ],
    savingsGoals: [
      { id: 's1', title: 'iPhone 17 Pro Max', target: 2500000, saved: 100000, createdAt: '', updatedAt: '' },
    ],
    challenge: { ...DEFAULT_CHALLENGE, startDate: '2026-10-01', habitIds: ['seed-habit-2'] },
    preferences: { ...DEFAULT_PREFERENCES, name: 'Alan', theme: 'light' },
  };
}

describe('buildBackup / parseBackupText', () => {
  it('exporta e importa un ciclo completo con los mismos datos', () => {
    const data = sampleData();
    const backup = buildBackup(data);
    const text = JSON.stringify(backup, null, 2);

    const { data: imported, counts } = parseBackupText(text);
    expect(imported.habits).toHaveLength(data.habits.length);
    expect(imported.goals).toHaveLength(data.goals.length);
    expect(imported.tasks).toHaveLength(1);
    expect(imported.routines).toHaveLength(1);
    expect(imported.transactions).toHaveLength(1);
    expect(imported.savingsGoals).toHaveLength(1);
    expect(imported.challenge.startDate).toBe('2026-10-01');
    expect(imported.challenge.habitIds).toEqual(['seed-habit-2']);
    expect(imported.preferences.name).toBe('Alan');
    expect(imported.preferences.theme).toBe('light');
    expect(counts.goals).toBe(25);
    expect(counts.habits).toBe(10);
    // El historial de hábitos se conserva.
    expect(imported.habits.map((h) => h.name)).toEqual(data.habits.map((h) => h.name));
  });

  it('conserva el historial de hábitos y los pasos de objetivos', () => {
    const data = sampleData();
    data.habits[0].history = ['2026-10-08', '2026-10-09'];
    data.goals[0].steps = [{ id: 'p1', title: 'Paso 1', done: true }];
    const { data: imported } = parseBackupText(JSON.stringify(buildBackup(data)));
    expect(imported.habits[0].history).toEqual(['2026-10-08', '2026-10-09']);
    expect(imported.goals[0].steps).toEqual([{ id: 'p1', title: 'Paso 1', done: true }]);
  });
});

describe('validación de archivos inválidos', () => {
  it('rechaza JSON mal formado', () => {
    expect(() => parseBackupText('{esto no es json')).toThrow(BackupError);
  });

  it('rechaza objetos que no son copias de la app', () => {
    expect(() => parseBackupText(JSON.stringify({ algo: 1 }))).toThrow(/copia de seguridad/);
    expect(() => validateBackup(null)).toThrow(BackupError);
    expect(() => validateBackup('texto')).toThrow(BackupError);
    expect(() => validateBackup([1, 2, 3])).toThrow(BackupError);
  });

  it('rechaza versiones futuras', () => {
    const backup = buildBackup(sampleData());
    expect(() => validateBackup({ ...backup, version: BACKUP_VERSION + 1 })).toThrow(/versión/);
  });

  it('rechaza cuando falta la sección data', () => {
    expect(() => validateBackup({ app: 'mi-vida-en-orden', version: 1, data: 'x' })).toThrow(BackupError);
    expect(() => validateBackup({ app: 'mi-vida-en-orden', version: 1, data: null })).toThrow(/data/);
  });

  it('rechaza cuando las listas no son listas', () => {
    expect(() =>
      validateBackup({ app: 'mi-vida-en-orden', version: 1, data: { habits: 'no-array' } }),
    ).toThrow(/habits/);
  });

  it('rechaza un archivo sin datos reconocibles', () => {
    expect(() =>
      validateBackup({
        app: 'mi-vida-en-orden',
        version: 1,
        data: { habits: [{ foo: 1 }, { bar: 2 }] },
      }),
    ).toThrow(/reconocibles/);
  });

  it('descarta registros corruptos pero conserva los válidos', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const data = sampleData();
      const backup = buildBackup(data);
      const tampered = {
        ...backup,
        data: { ...data, habits: [null, 'x', ...data.habits] },
      };
      const { data: imported, counts } = validateBackup(tampered);
      expect(counts.habits).toBe(10);
      expect(imported.habits).toHaveLength(10);
      // Avisa por consola cuántos registros descartó.
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('2 registros inválidos'));
    } finally {
      warn.mockRestore();
    }
  });

  it('si faltan preferencias o desafío usa valores por defecto', () => {
    const backup = buildBackup(sampleData());
    const withoutExtras = { ...backup, data: { ...sampleData() } };
    delete (withoutExtras.data as Record<string, unknown>).preferences;
    delete (withoutExtras.data as Record<string, unknown>).challenge;
    const { data: imported } = validateBackup(withoutExtras);
    expect(imported.preferences).toEqual(DEFAULT_PREFERENCES);
    expect(imported.challenge).toEqual(DEFAULT_CHALLENGE);
  });

  it('acepta un backup con arrays vacíos (datos borrados)', () => {
    const empty: AppData = {
      habits: [],
      goals: [],
      tasks: [],
      routines: [],
      transactions: [],
      savingsGoals: [],
      challenge: { ...DEFAULT_CHALLENGE },
      preferences: { ...DEFAULT_PREFERENCES },
    };
    const { data: imported, counts } = validateBackup(buildBackup(empty));
    expect(imported.habits).toEqual([]);
    expect(counts.goals).toBe(0);
  });
});
