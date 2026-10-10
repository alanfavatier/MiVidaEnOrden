// Datos iniciales: hábitos sugeridos y objetivos personales.
// No se inventan fechas límite ni porcentajes de progreso.

import type { Goal, Habit, GoalCategory } from '../types';
import { todayISO } from './dates';

export const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

const HABIT_CATEGORIES = [
  'Disciplina',
  'Salud y cuidado personal',
  'Estudio',
  'Aprendizaje',
  'Finanzas',
] as const;

/** Hábitos sugeridos que se cargan al iniciar por primera vez. */
export function createSeedHabits(): Habit[] {
  const start = todayISO();
  const now = new Date().toISOString();
  const list: { name: string; category: string }[] = [
    { name: 'Levantarme a la hora planificada', category: 'Disciplina' },
    { name: 'Ir al gimnasio', category: 'Salud y cuidado personal' },
    { name: 'Cumplir con mi higiene personal', category: 'Salud y cuidado personal' },
    { name: 'Hacer skincare por la mañana', category: 'Salud y cuidado personal' },
    { name: 'Hacer skincare por la noche', category: 'Salud y cuidado personal' },
    { name: 'Estudiar programación', category: 'Estudio' },
    { name: 'Practicar inglés', category: 'Estudio' },
    { name: 'Leer', category: 'Aprendizaje' },
    { name: 'Practicar guitarra', category: 'Aprendizaje' },
    { name: 'Registrar mis ingresos y gastos', category: 'Finanzas' },
  ];
  return list.map((h, i) => ({
    id: `seed-habit-${i + 1}`,
    name: h.name,
    category: h.category,
    frequency: { type: 'daily' },
    startDate: start,
    history: [],
    createdAt: now,
  }));
}

export const SEED_HABIT_CATEGORY_OPTIONS: string[] = [...HABIT_CATEGORIES, 'Hogar', 'Trabajo', 'Otra'];

interface SeedGoal {
  title: string;
  category: GoalCategory;
}

/** Objetivos iniciales agrupados por categoría. */
export const SEED_GOALS: SeedGoal[] = [
  // Salud y cuidado personal
  { title: 'Mejorar mi estado físico durante los próximos 60 días', category: 'Salud y cuidado personal' },
  { title: 'Mantener constancia en el gimnasio', category: 'Salud y cuidado personal' },
  { title: 'Crear una rutina de skincare e higiene', category: 'Salud y cuidado personal' },
  { title: 'Empezar la depilación definitiva', category: 'Salud y cuidado personal' },
  { title: 'Comprar ropa para el gimnasio', category: 'Salud y cuidado personal' },
  // Carrera y tecnología
  { title: 'Terminar mi proyecto de página web', category: 'Carrera y tecnología' },
  { title: 'Preparar un buen portfolio en GitHub', category: 'Carrera y tecnología' },
  { title: 'Mejorar mi LinkedIn y mis perfiles laborales', category: 'Carrera y tecnología' },
  { title: 'Aprender inglés', category: 'Carrera y tecnología' },
  { title: 'Aprender a programar con inteligencia artificial', category: 'Carrera y tecnología' },
  { title: 'Seguir mejorando mis habilidades como desarrollador', category: 'Carrera y tecnología' },
  // Dinero y compras
  { title: 'Comprar un iPhone 17 Pro Max', category: 'Dinero y compras' },
  { title: 'Comprar ropa nueva', category: 'Dinero y compras' },
  { title: 'Comprar zapatillas nuevas', category: 'Dinero y compras' },
  { title: 'Ahorrar para comprar un Toyota Corolla', category: 'Dinero y compras' },
  { title: 'Organizar mis ingresos y gastos', category: 'Dinero y compras' },
  // Hogar
  { title: 'Ordenar mi habitación', category: 'Hogar' },
  { title: 'Pintar y decorar mi habitación', category: 'Hogar' },
  { title: 'Ordenar y mejorar mi gimnasio en casa', category: 'Hogar' },
  // Aprendizaje personal
  { title: 'Leer con mayor frecuencia', category: 'Aprendizaje personal' },
  { title: 'Aprender guitarra', category: 'Aprendizaje personal' },
  { title: 'Empezar un curso de electricidad', category: 'Aprendizaje personal' },
  { title: 'Empezar un curso de refrigeración y aire acondicionado', category: 'Aprendizaje personal' },
  // Organización
  { title: 'Organizar mis horarios de gimnasio, trabajo, reparto de agua, estudio y tiempo libre', category: 'Organización' },
  { title: 'Mantener una rutina diaria sostenible', category: 'Organización' },
];

export function createSeedGoals(): Goal[] {
  const now = new Date().toISOString();
  return SEED_GOALS.map((g, i) => ({
    id: `seed-goal-${i + 1}`,
    title: g.title,
    description: '',
    category: g.category,
    priority: 'media',
    startDate: null,
    dueDate: null,
    status: 'pendiente',
    steps: [],
    notes: '',
    budget: null,
    progress: 0,
    createdAt: now,
    updatedAt: now,
  }));
}
