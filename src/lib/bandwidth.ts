/**
 * Data size and bandwidth arithmetic. Pure math, no dependencies.
 *
 * The perennial confusion this tool exists to settle: storage is sold in bytes
 * (GB, TB) while links are sold in bits per second (Mbps, Gbps), an eightfold
 * difference before overheads. Sizes here use decimal units (1 GB = 1e9 bytes)
 * with binary (GiB) conversions shown alongside.
 */

export const SIZE_UNITS = {
  B: 1,
  KB: 1e3,
  MB: 1e6,
  GB: 1e9,
  TB: 1e12,
  PB: 1e15,
  KiB: 1024,
  MiB: 1024 ** 2,
  GiB: 1024 ** 3,
  TiB: 1024 ** 4,
  PiB: 1024 ** 5,
} as const;

export type SizeUnit = keyof typeof SIZE_UNITS;

export const RATE_UNITS = {
  'bit/s': 1,
  'Kbps': 1e3,
  'Mbps': 1e6,
  'Gbps': 1e9,
  'Tbps': 1e12,
  'KB/s': 8e3,
  'MB/s': 8e6,
  'GB/s': 8e9,
} as const;

export type RateUnit = keyof typeof RATE_UNITS;

export function toBytes(value: number, unit: SizeUnit): number {
  return value * SIZE_UNITS[unit];
}

export function toBitsPerSecond(value: number, unit: RateUnit): number {
  return value * RATE_UNITS[unit];
}

/**
 * Seconds to transfer a payload over a link, with an efficiency factor for
 * protocol overhead. 100% is the theoretical line rate; real TCP transfers
 * commonly reach 85 to 95% of it on a clean path.
 */
export function transferSeconds(bytes: number, bitsPerSecond: number, efficiencyPercent = 100): number {
  if (bitsPerSecond <= 0 || efficiencyPercent <= 0) return Infinity;
  return (bytes * 8) / (bitsPerSecond * (efficiencyPercent / 100));
}

/** All size units for a byte count, for display tables. */
export function sizeBreakdown(bytes: number): Record<SizeUnit, number> {
  const out = {} as Record<SizeUnit, number>;
  for (const [unit, factor] of Object.entries(SIZE_UNITS)) {
    out[unit as SizeUnit] = bytes / factor;
  }
  return out;
}

/** Human duration: "2d 4h", "3h 12m", "45s". Mirrors the SLA formatter. */
export function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) return 'never';
  if (seconds < 1) return 'under a second';
  const units: [number, string][] = [
    [86_400, 'd'],
    [3_600, 'h'],
    [60, 'm'],
    [1, 's'],
  ];
  const parts: string[] = [];
  let rest = Math.round(seconds);
  for (const [size, label] of units) {
    if (parts.length === 2) break;
    const n = Math.floor(rest / size);
    if (n > 0) {
      parts.push(`${n}${label}`);
      rest -= n * size;
    }
  }
  return parts.join(' ') || '0s';
}
