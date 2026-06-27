/**
 * Formatting helpers — used by every screen, kept framework-agnostic.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function timeAgo(input: number | string | Date): string {
  const ts = typeof input === 'number'
    ? input
    : new Date(input).getTime();
  const diff = Date.now() - ts;
  if (diff < 0) return 'just now';
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function formatTime(input: number | string | Date): string {
  const d = typeof input === 'number' ? new Date(input) : new Date(input);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(input: number | string | Date): string {
  const d = typeof input === 'number' ? new Date(input) : new Date(input);
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** km/h with one decimal — matches the unit the backend stores speed in. */
export function formatSpeed(kmh: number | undefined | null): string {
  if (kmh == null || isNaN(kmh)) return '—';
  if (kmh < 1) return '0.0';
  return kmh.toFixed(1);
}

/** km, with appropriate precision based on magnitude. */
export function formatDistance(km: number | undefined | null): string {
  if (km == null || isNaN(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(2)} km`;
  return `${km.toFixed(1)} km`;
}

export function formatDuration(ms: number | undefined | null): string {
  if (!ms || ms < 1000) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatCoords(lat: number, lng: number, digits = 4): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(digits)}°${latDir}, ${Math.abs(lng).toFixed(digits)}°${lngDir}`;
}

export function truncateHash(hash: string | null | undefined, head = 8, tail = 6): string {
  if (!hash) return '';
  if (hash.length <= head + tail + 1) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

/** Title-case a snake/kebab/upper string: PANIC_ALERT → Panic Alert */
export function humanize(s: string): string {
  return s
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
