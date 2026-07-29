export type StorageKind = 'local' | 'session';

function getStorage(kind: StorageKind) {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readStorage(kind: StorageKind, key: string) {
  try {
    return getStorage(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorage(kind: StorageKind, key: string, value: string) {
  try {
    getStorage(kind)?.setItem(key, value);
  } catch {
    // Storage can be unavailable in private or constrained browser contexts.
  }
}

export function readNonNegativeInteger(kind: StorageKind, key: string) {
  const parsed = Number.parseInt(readStorage(kind, key) || '0', 10);
  return Math.max(0, Number.isFinite(parsed) ? parsed : 0);
}

export function writeNonNegativeInteger(kind: StorageKind, key: string, value: number) {
  writeStorage(kind, key, String(Math.max(0, Math.floor(value))));
}

export function readJson<T>(kind: StorageKind, key: string): T | undefined {
  const raw = readStorage(kind, key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function writeJson(kind: StorageKind, key: string, value: unknown) {
  writeStorage(kind, key, JSON.stringify(value));
}
