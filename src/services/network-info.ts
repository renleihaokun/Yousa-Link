import { fetchJson } from './http';
import { readJson, writeJson } from './storage';

export type NetworkInfo = {
  ip?: string;
  location?: {
    city?: string;
    region?: string;
  };
};

const CACHE_KEY = 'yousa-network-info-v1';
let request: Promise<NetworkInfo> | undefined;

function parseNetworkInfo(value: unknown): NetworkInfo {
  if (!value || typeof value !== 'object') throw new Error('Invalid network response');
  const data = value as Record<string, unknown>;
  const location = data.location && typeof data.location === 'object'
    ? data.location as Record<string, unknown>
    : undefined;
  return {
    ip: typeof data.ip === 'string' ? data.ip : undefined,
    location: location ? {
      city: typeof location.city === 'string' ? location.city : undefined,
      region: typeof location.region === 'string' ? location.region : undefined
    } : undefined
  };
}

export function getNetworkInfo() {
  const cached = readJson<NetworkInfo>('session', CACHE_KEY);
  if (cached) return Promise.resolve(cached);

  request ??= fetchJson('https://ip.nemui.cn/api/ip', 4000)
    .then(parseNetworkInfo)
    .then((data) => {
      writeJson('session', CACHE_KEY, data);
      return data;
    });
  return request;
}
