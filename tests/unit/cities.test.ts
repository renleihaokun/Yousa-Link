import { describe, expect, it } from 'vitest';
import { findCity, getDistanceKm, normalizeLocationName } from '../../src/domain/cities';

describe('city domain', () => {
  it('normalizes accents, punctuation, and a city suffix', () => {
    expect(normalizeLocationName('Beijing City')).toBe('beijing');
    expect(normalizeLocationName('  Ürümqi ')).toBe('urumqi');
  });

  it('uses region to disambiguate duplicated city names', () => {
    expect(findCity('changsha')?.region).toBeUndefined();
    expect(findCity('changsha', 'hunan')?.name).toBe('长沙');
    expect(findCity('beijing')?.name).toBe('北京');
  });

  it('calculates a stable rounded great-circle distance', () => {
    const beijing = findCity('beijing')!;
    const shanghai = findCity('shanghai')!;
    expect(getDistanceKm(beijing, beijing)).toBe(0);
    expect(getDistanceKm(beijing, shanghai)).toBeGreaterThan(1000);
    expect(getDistanceKm(beijing, shanghai)).toBeLessThan(1100);
  });
});
