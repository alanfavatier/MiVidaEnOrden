// Utilidades de dinero: moneda peso argentino (ARS).

/** Formatea un importe como "$ 1.234,56" (ARS, español de Argentina). */
export function formatARS(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formatea sin decimales cuando el importe es entero: "$ 1.234". */
export function formatARSCompacto(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Interpreta un texto escrito por el usuario como importe.
 * Acepta formatos argentinos: "1.234.567,89", "2.500.000", "15.000",
 * "1234,56", "1234.56" y "$ 15.000".
 * Devuelve null si no es un número válido.
 */
export function parseAmount(text: string): number | null {
  if (typeof text !== 'string') return null;
  let t = text.trim().replace(/[$\u20b9]/g, '').trim();
  if (!t) return null;

  // Separadores de miles con espacio ("1 234").
  t = t.replace(/(?<=\d)\s+(?=\d{3}(?!\d))/g, '').trim();
  // Cualquier otro espacio hace la entrada inválida ("1 2 3").
  if (/\s/.test(t)) return null;

  const hasComma = t.includes(',');
  const hasDot = t.includes('.');

  if (hasComma && hasDot) {
    // El último separador es el decimal; el otro agrupa miles.
    if (t.lastIndexOf(',') > t.lastIndexOf('.')) {
      t = t.replace(/\./g, '').replace(',', '.');
    } else {
      t = t.replace(/,/g, '');
    }
  } else if (hasComma) {
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) {
      t = t.replace(/,/g, ''); // comas de miles: 1,234,567
    } else if (t.includes(',')) {
      t = t.replace(/,/g, '.'); // coma decimal: 1234,56
    }
  } else if (hasDot) {
    if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
      t = t.replace(/\./g, ''); // puntos de miles: 2.500.000
    }
    // Si no agrupa miles, el punto se mantiene como decimal: 1234.56
  }

  if (!/^-?\d*(\.\d+)?$/.test(t) || t === '' || t === '-' || t === '.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Redondea a 2 decimales (para totales). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
