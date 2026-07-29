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

const PLAYLIST_URL = 'https://meting.mysqil.com/api?server=netease&type=playlist&id=69909382';
const CACHE_KEY = 'yousa-playlist-v1';
const CACHE_TTL = 30 * 60 * 1000;

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

  const songs = parsePlaylist(await fetchJson(PLAYLIST_URL, 8000));
  if (songs.length === 0) throw new Error('Playlist is empty');
  writeJson('session', CACHE_KEY, { expiresAt: Date.now() + CACHE_TTL, songs });
  return songs;
}
