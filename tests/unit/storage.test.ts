import { describe, expect, it } from 'vitest';
import {
  readJson,
  readNonNegativeInteger,
  readStorage,
  writeJson,
  writeNonNegativeInteger
} from '../../src/services/storage';

describe('storage service', () => {
  it('handles malformed and negative values safely', () => {
    window.sessionStorage.clear();
    window.sessionStorage.setItem('bad-json', '{');
    window.sessionStorage.setItem('negative', '-4');
    expect(readJson('session', 'bad-json')).toBeUndefined();
    expect(readNonNegativeInteger('session', 'negative')).toBe(0);
    writeNonNegativeInteger('session', 'count', 3.8);
    expect(readNonNegativeInteger('session', 'count')).toBe(3);
  });

  it('round-trips JSON and falls back when storage throws', () => {
    writeJson('session', 'object', { ok: true });
    expect(readJson<{ ok: boolean }>('session', 'object')).toEqual({ ok: true });
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new Error('blocked'); } });
    expect(readStorage('local', 'anything')).toBeNull();
    if (original) Object.defineProperty(window, 'localStorage', original);
  });
});
