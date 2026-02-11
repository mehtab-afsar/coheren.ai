import { useState } from 'react';

export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return m && m[2].length === 11 ? m[2] : null;
}

export function timeToSeconds(t: string): number {
  if (!t) return 0;
  const parts = t.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(parts[0]) || 0;
}

export function useCinemaMode() {
  const [cinemaTaskId, setCinemaTaskId] = useState<string | null>(null);

  return {
    cinemaTaskId,
    setCinemaTaskId,
    getYouTubeId,
    timeToSeconds,
  };
}
