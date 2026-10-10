// Tipos compartidos de Mi Vida en Orden.

export type ID = string;

export interface Habit {
  id: ID;
  name: string;
  category: string;
  /** Frecuencia: diaria, días específicos de la semana o cantidad de veces por semana. */
  frequency: HabitFrequency;
  /** Fecha de inicio en formato ISO (AAAA-MM-DD). */
  startDate: string;
  /** Historial de cumplimiento: fechas ISO en las que se marcó como completado. */
  history: string[];
  createdAt: string;
}

export type HabitFrequency =
  | { type: 'daily' }
  | { type: 'days'; days: number[] } // 0 = Domingo ... 6 = Sábado
  | { type: 'timesPerWeek'; times: number };

export interface GoalStep {
  id: ID;
  title: string;
  done: boolean;
}

export type GoalCategory =
  | 'Salud y cuidado personal'
  | 'Carrera y tecnología'
  | 'Dinero y compras'
  | 'Hogar'
  | 'Aprendizaje personal'
  | 'Organización'
  | 'Otra';

export type GoalStatus = 'pendiente' | 'en progreso' | 'completado';
export type GoalPriority = 'baja' | 'media' | 'alta';

export interface Goal {
  id: ID;
  title: string;
  description: string;
  category: GoalCategory;
  priority: GoalPriority;
  /** Fecha de inicio en formato ISO (AAAA-MM-DD). */
  startDate: string | null;
  /** Fecha límite opcional en formato ISO (AAAA-MM-DD). */
  dueDate: string | null;
  status: GoalStatus;
  steps: GoalStep[];
  notes: string;
  /** Presupuesto objetivo en ARS, opcional. */
  budget: number | null;
  /** Progreso porcentual manual (0-100). Si hay pasos, se calcula desde ellos. */
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export type TaskCategory =
  | 'Gimnasio'
  | 'Trabajo'
  | 'Reparto de agua'
  | 'Estudio'
  | 'Programación'
  | 'Inglés'
  | 'Recreación'
  | 'Personal';

export interface Task {
  id: ID;
  title: string;
  /** Fecha en formato ISO (AAAA-MM-DD). */
  date: string;
  /** Hora en formato HH:MM (24h). */
  time: string | null;
  /** Duración en minutos. */
  duration: number | null;
  category: TaskCategory;
  done: boolean;
  notes: string;
  createdAt: string;
}

/** Entrada reutilizable de la rutina semanal (no impone horarios: son opcionales). */
export interface RoutineEntry {
  id: ID;
  /** 0 = Domingo ... 6 = Sábado */
  weekday: number;
  title: string;
  time: string | null;
  duration: number | null;
  category: TaskCategory;
}

export type IncomeSource =
  | 'Trabajo en el almacén'
  | 'Venta de helados'
  | 'Reparto y venta de bidones de agua'
  | 'Otros ingresos';

export type TransactionType = 'ingreso' | 'gasto';

export interface Transaction {
  id: ID;
  type: TransactionType;
  /** Importe en pesos argentinos (siempre positivo). */
  amount: number;
  /** Fecha en formato ISO (AAAA-MM-DD). */
  date: string;
  description: string;
  /** Categoría de gasto o fuente de ingreso. */
  category: string;
  notes: string;
  /**
   * Indica una transferencia entre categorías propias.
   * No se cuenta como ingreso nuevo ni como gasto.
   */
  transfer: boolean;
  createdAt: string;
}

export interface SavingsGoal {
  id: ID;
  title: string;
  /** Precio estimado en ARS. */
  target: number;
  /** Importe ahorrado en ARS. */
  saved: number;
  createdAt: string;
  updatedAt: string;
}

export interface Challenge {
  /** Fecha de inicio en formato ISO (AAAA-MM-DD), o null si no está iniciado. */
  startDate: string | null;
  totalDays: number;
  /** Hábitos asociados al desafío. */
  habitIds: ID[];
  notes: string;
}

export interface Preferences {
  theme: 'dark' | 'light' | 'pink';
  /** Nombre opcional que se usa en el saludo. */
  name: string;
}

export interface AppData {
  habits: Habit[];
  goals: Goal[];
  tasks: Task[];
  routines: RoutineEntry[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  challenge: Challenge;
  preferences: Preferences;
}

export interface BackupFile {
  app: 'mi-vida-en-orden';
  version: number;
  exportedAt: string;
  data: AppData;
}
