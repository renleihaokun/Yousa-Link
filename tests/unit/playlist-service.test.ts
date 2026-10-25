import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchJson } = vi.hoisted(() => ({ fetchJson: vi.fn() }));
vi.mock('../../src/services/http', () => ({ fetchJson }));

describe('playlist service', () => {
  beforeEach(() => {
    fetchJson.mockReset();
    window.sessionStorage.clear();
  });

  it('converts valid third-party entries to internal songs and ignores invalid entries', async () => {
    fetchJson.mockResolvedValue([
      { name: 'A', author: 'B', url: 'https://audio/a.mp3', pic: 'https://img/a.jpg' },
      { title: 'C', artist: 'D', url: 'null' },
      null
    ]);
    const { loadPlaylist } = await import('../../src/services/playlist-service');
    await expect(loadPlaylist()).resolves.toEqual([
      { name: 'A', author: 'B', url: 'https://audio/a.mp3', pic: 'https://img/a.jpg' }
    ]);
  });

  it('uses a valid session cache and rejects an empty response', async () => {
    window.sessionStorage.setItem('yousa-playlist-recording-v1', JSON.stringify({
      expiresAt: Date.now() + 60_000,
      songs: [{ name: 'Cached', author: 'A', url: 'https://audio/cached.mp3', pic: '' }]
    }));
    const { loadPlaylist } = await import('../../src/services/playlist-service');
    await expect(loadPlaylist()).resolves.toHaveLength(1);
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it('rejects a response without playable songs', async () => {
    fetchJson.mockResolvedValue([{ name: 'Unavailable', url: 'null' }]);
    const { loadPlaylist } = await import('../../src/services/playlist-service');
    await expect(loadPlaylist()).rejects.toThrow('Playlist is empty');
  });

  it('falls back to the next source when the first one fails', async () => {
    fetchJson
      .mockRejectedValueOnce(new Error('Request failed: 522'))
      .mockResolvedValueOnce([{ name: 'B', artist: 'C', url: 'https://audio/b.mp3', pic: '' }]);
    const { loadPlaylist } = await import('../../src/services/playlist-service');
    await expect(loadPlaylist()).resolves.toEqual([
      { name: 'B', author: 'C', url: 'https://audio/b.mp3', pic: '' }
    ]);
    expect(fetchJson).toHaveBeenCalledTimes(2);
  });
});
