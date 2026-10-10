import { describe, it, expect } from 'vitest';
import { formatARS, formatARSCompacto, parseAmount, round2 } from './money';

describe('money', () => {
  it('formatea en pesos argentinos', () => {
    const s = formatARS(1234.5);
    expect(s).toContain('1.234,50');
    expect(s).toMatch(/\$|ARS/); // símbolo local del peso
    expect(formatARS(0)).toContain('0,00');
  });

  it('formatea importes compactos', () => {
    expect(formatARSCompacto(1234)).toContain('1.234');
    expect(formatARSCompacto(1234.5)).toContain('1.234,5');
  });

  it('parsea números con formato argentino', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('1234,56')).toBe(1234.56);
    expect(parseAmount('1234.56')).toBe(1234.56);
    expect(parseAmount('$ 15.000')).toBe(15000);
    expect(parseAmount('15000')).toBe(15000);
    expect(parseAmount('0')).toBe(0);
    expect(parseAmount('1,234')).toBe(1234); // coma de miles
  });

  it('acepta múltiples puntos como separadores de miles', () => {
    expect(parseAmount('2.500.000')).toBe(2500000);
    expect(parseAmount('1.234.567')).toBe(1234567);
    expect(parseAmount('1.234.567,89')).toBe(1234567.89);
    expect(parseAmount('1.000.000.000')).toBe(1000000000);
  });

  it('acepta coma como separador de miles anglosajón', () => {
    expect(parseAmount('1,234,567')).toBe(1234567);
    expect(parseAmount('1,234,567.89')).toBe(1234567.89);
  });

  it('rechaza entradas inválidas', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('12.34.56')).toBeNull();
    expect(parseAmount('-')).toBeNull();
    expect(parseAmount('1 2 3')).toBeNull();
  });

  it('redondea a 2 decimales', () => {
    expect(round2(10.006)).toBe(10.01);
    expect(round2(10.004)).toBe(10);
    expect(round2(1 / 3)).toBe(0.33);
    expect(round2(2.675 * 100)).toBe(267.5);
  });
});
