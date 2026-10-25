import { fetchJson } from './http';
import { readJson, writeJson } from './storage';

export type Song = {
  name: string;
  author: string;
  url: string;
  pic: string;
};

type PlaylistCache = {
  expiresAt: number;
  songs: Song[];
};

// 【临时 · 拍摄用】只放《大海带不走》一首；拍完还原成 69909382 歌单
const PLAYLIST_SOURCES = [
  'https://api.injahow.cn/meting/?server=netease&type=song&id=2664420463',
  'https://api.qijieya.cn/meting/?server=netease&type=song&id=2664420463'
];
// 换一个缓存键，避免浏览器里缓存的整张歌单把这首歌盖掉
const CACHE_KEY = 'yousa-playlist-recording-v1';
const CACHE_TTL = 30 * 60 * 1000;
// 公益实例冷启动最慢要 8s 以上，超时放宽到 15s
const REQUEST_TIMEOUT = 15000;

function parsePlaylist(value: unknown) {
  const raw = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as { songs?: unknown }).songs)
      ? (value as { songs: unknown[] }).songs
      : [];

  return raw.flatMap((entry): Song[] => {
    if (!entry || typeof entry !== 'object') return [];
    const song = entry as Record<string, unknown>;
    const url = typeof song.url === 'string' ? song.url : '';
    if (!url || url === 'null') return [];
    return [{
      name: typeof song.name === 'string' ? song.name : typeof song.title === 'string' ? song.title : '未知歌曲',
      author: typeof song.author === 'string' ? song.author : typeof song.artist === 'string' ? song.artist : '泠鸢yousa',
      url,
      pic: typeof song.pic === 'string' ? song.pic : ''
    }];
  });
}

export async function loadPlaylist() {
  const cached = readJson<PlaylistCache>('session', CACHE_KEY);
  if (cached && cached.expiresAt > Date.now() && Array.isArray(cached.songs) && cached.songs.length > 0) {
    return cached.songs;
  }

  let lastError: unknown;
  for (const source of PLAYLIST_SOURCES) {
    try {
      const songs = parsePlaylist(await fetchJson(source, REQUEST_TIMEOUT));
      if (songs.length === 0) throw new Error('Playlist is empty');
      writeJson('session', CACHE_KEY, { expiresAt: Date.now() + CACHE_TTL, songs });
      return songs;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Playlist is empty');
}
