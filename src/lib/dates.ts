// Utilidades de fechas. Formato de presentación: DD/MM/AAAA.

/** Devuelve la fecha local de hoy en formato ISO (AAAA-MM-DD). */
export function todayISO(): string {
  return toISO(new Date());
}

/** Convierte un Date a string ISO (AAAA-MM-DD) usando la zona horaria local. */
export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Convierte un string ISO (AAAA-MM-DD) a Date a medianoche local. */
export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Formatea una fecha ISO como DD/MM/AAAA. */
export function formatISO(iso: string | null | undefined): string {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Suma (o resta) días a una fecha ISO. */
export function addDays(iso: string, days: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** Diferencia en días entre dos fechas ISO (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((fromISO(b).getTime() - fromISO(isoOrToday(a)).getTime()) / 86400000);
}

function isoOrToday(iso: string | null | undefined): string {
  return iso || todayISO();
}

/** Día de la semana de una fecha ISO: 0 = Domingo ... 6 = Sábado. */
export function weekdayOf(iso: string): number {
  return fromISO(iso).getDay();
}

/** Lunes de la semana (semana laboral/argentina: empieza en lunes). */
export function startOfWeek(iso: string): string {
  const d = fromISO(iso);
  const day = d.getDay(); // 0 dom ... 6 sáb
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return toISO(d);
}

/** Los 7 días ISO de la semana (lunes a domingo) que contienen a `iso`. */
export function weekDays(iso: string): string[] {
  const start = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Primer día del mes que contiene a `iso`. */
export function startOfMonth(iso: string): string {
  const d = fromISO(iso);
  d.setDate(1);
  return toISO(d);
}

/** Último día del mes que contiene a `iso`. */
export function endOfMonth(iso: string): string {
  const d = fromISO(iso);
  d.setMonth(d.getMonth() + 1, 0);
  return toISO(d);
}

/** Clave de mes AAAA-MM. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** Suma un número de meses a una clave de mes. */
export function addMonthsKey(key: string, months: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1 + months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Lista los días ISO de un mes completo (AAAA-MM). */
export function daysOfMonth(key: string): string[] {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return Array.from({ length: last }, (_, i) => `${key}-${String(i + 1).padStart(2, '0')}`);
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const WEEKDAYS_LONG = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
];

const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Nombre del mes a partir de una clave AAAA-MM. */
export function monthName(key: string): string {
  const [, m] = key.split('-').map(Number);
  return MONTHS[(m || 1) - 1];
}

/** "Octubre 2026" a partir de una clave AAAA-MM. */
export function monthLabel(key: string): string {
  const [y] = key.split('-');
  return `${monthName(key)} ${y}`;
}

/** Fecha larga en español: "Viernes 09 de Octubre de 2026". */
export function longDate(iso: string): string {
  const d = fromISO(iso);
  return `${WEEKDAYS_LONG[d.getDay()]} ${String(d.getDate()).padStart(2, '0')} de ${
    MONTHS[d.getMonth()]
  } de ${d.getFullYear()}`;
}

export function weekdayLong(index: number): string {
  return WEEKDAYS_LONG[index] ?? '';
}

export function weekdayShort(index: number): string {
  return WEEKDAYS_SHORT[index] ?? '';
}

/** Validación básica de un string ISO (AAAA-MM-DD). */
export function isValidISO(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = fromISO(value);
  return !Number.isNaN(d.getTime()) && toISO(d) === value;
}

/** Validación de hora HH:MM. */
export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
