/**
 * Unit tests for youtube.ts's live-existence verification (verifyYouTubeVideoLive).
 *
 * isEmbeddableVideoUrl only checks URL shape; verifyYouTubeVideoLive is the real
 * check — it calls YouTube's oEmbed endpoint through the ai-proxy edge function
 * and reports whether the video still exists/is public. Mocks proxyFetch so no
 * real network call happens.
 *
 * Run: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@lib/ai-proxy-fetch', () => ({
  proxyFetch: vi.fn(),
}));

import { proxyFetch } from '@lib/ai-proxy-fetch';
import { verifyYouTubeVideoLive } from '@lib/youtube';

function mockRes(ok: boolean): Response {
  return { ok } as Response;
}

beforeEach(() => {
  vi.mocked(proxyFetch).mockReset();
});

describe('verifyYouTubeVideoLive — non-video input', () => {
  it('returns false without calling proxyFetch for a non-YouTube URL', async () => {
    const result = await verifyYouTubeVideoLive('https://example.com/article');
    expect(result).toBe(false);
    expect(proxyFetch).not.toHaveBeenCalled();
  });

  it('returns false for null/undefined', async () => {
    expect(await verifyYouTubeVideoLive(null)).toBe(false);
    expect(await verifyYouTubeVideoLive(undefined)).toBe(false);
    expect(proxyFetch).not.toHaveBeenCalled();
  });
});

describe('verifyYouTubeVideoLive — real oEmbed check', () => {
  it('returns true when oEmbed resolves ok', async () => {
    vi.mocked(proxyFetch).mockResolvedValueOnce(mockRes(true));
    const result = await verifyYouTubeVideoLive('https://www.youtube.com/watch?v=aaaaaaaaaa1');
    expect(result).toBe(true);
    expect(proxyFetch).toHaveBeenCalledTimes(1);
    const calledUrl = vi.mocked(proxyFetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain('/youtube/oembed');
    expect(calledUrl).toContain('aaaaaaaaaa1');
  });

  it('returns false when oEmbed responds not-ok (deleted/private video)', async () => {
    vi.mocked(proxyFetch).mockResolvedValueOnce(mockRes(false));
    const result = await verifyYouTubeVideoLive('https://www.youtube.com/watch?v=bbbbbbbbbb2');
    expect(result).toBe(false);
  });

  it('returns false on a network/proxy failure', async () => {
    vi.mocked(proxyFetch).mockRejectedValueOnce(new Error('network down'));
    const result = await verifyYouTubeVideoLive('https://www.youtube.com/watch?v=cccccccccc3');
    expect(result).toBe(false);
  });
});

describe('verifyYouTubeVideoLive — caching', () => {
  it('does not re-fetch for the same video ID within the TTL window', async () => {
    vi.mocked(proxyFetch).mockResolvedValueOnce(mockRes(true));
    const url = 'https://www.youtube.com/watch?v=dddddddddd4';
    const first = await verifyYouTubeVideoLive(url);
    const second = await verifyYouTubeVideoLive(url);
    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(proxyFetch).toHaveBeenCalledTimes(1);
  });
});
