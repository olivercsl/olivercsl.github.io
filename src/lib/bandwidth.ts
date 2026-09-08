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

/* ------------------------------------------------------------------ */
/* Long-haul reality: why a fast link does not give you a fast transfer */
/* ------------------------------------------------------------------ */

/**
 * Dividing size by link speed is the answer everyone expects and it is
 * usually wrong over distance, because a single TCP stream is not limited by
 * the link. It is limited by how much data it is allowed to have unacknowledged
 * in flight, and by how often loss forces it to halve its window.
 *
 * Two ceilings, and the lower one wins:
 *
 *   window limited   throughput = window / RTT
 *   loss limited     throughput ~= (MSS / RTT) * (sqrt(3/2) / sqrt(p))
 *
 * The second is the Mathis approximation. It models the sawtooth of classic
 * loss-based congestion control, so it is an estimate rather than a
 * measurement, and modern stacks using BBR behave differently. It is still the
 * right order of magnitude, and it is the reason a 1 Gbps path at 200ms with
 * 0.1% loss delivers single-digit megabits.
 */

/** sqrt(3/2), the constant in the Mathis approximation. */
const MATHIS_C = Math.sqrt(1.5);

/** Common TCP receive window sizes, in bytes. 64 KiB is the pre-scaling default. */
export const WINDOW_PRESETS: { label: string; bytes: number; note?: string }[] = [
  { label: '64 KiB', bytes: 65_536, note: 'default without window scaling' },
  { label: '256 KiB', bytes: 262_144 },
  { label: '1 MiB', bytes: 1_048_576 },
  { label: '4 MiB', bytes: 4_194_304, note: 'typical Linux autotuning maximum' },
  { label: '16 MiB', bytes: 16_777_216 },
];

/** Bytes in flight needed to keep the pipe full: bandwidth times round trip. */
export function bandwidthDelayProduct(bitsPerSecond: number, rttMs: number): number {
  return (bitsPerSecond * (rttMs / 1000)) / 8;
}

/** Ceiling imposed by the receive window: one window per round trip. */
export function windowLimitedBps(windowBytes: number, rttMs: number): number {
  if (rttMs <= 0) return Infinity;
  return (windowBytes * 8) / (rttMs / 1000);
}

/** Mathis approximation of loss-limited throughput. lossFraction of 0.001 is 0.1%. */
export function lossLimitedBps(mssBytes: number, rttMs: number, lossFraction: number): number {
  if (lossFraction <= 0) return Infinity;
  if (rttMs <= 0) return Infinity;
  return ((mssBytes * 8) / (rttMs / 1000)) * (MATHIS_C / Math.sqrt(lossFraction));
}

export interface LongHaulAnalysis {
  /** Bytes that must be in flight to saturate the link. */
  bdpBytes: number;
  windowLimitedBps: number;
  lossLimitedBps: number;
  /** What one stream actually achieves: the lowest of the three ceilings. */
  effectiveBps: number;
  /** Which ceiling binds. */
  limitedBy: 'link' | 'window' | 'loss';
  /** Parallel streams needed to fill the link, if anything caps a single one. */
  streamsToFillLink: number;
  /** Effective throughput as a share of the link, 0-100. */
  linkUtilisationPercent: number;
}

export function analyseLongHaul(
  linkBps: number,
  rttMs: number,
  windowBytes: number,
  lossPercent: number,
  mssBytes = 1460,
): LongHaulAnalysis {
  const win = windowLimitedBps(windowBytes, rttMs);
  const loss = lossLimitedBps(mssBytes, rttMs, lossPercent / 100);
  const effective = Math.min(linkBps, win, loss);

  const limitedBy: LongHaulAnalysis['limitedBy'] =
    effective === linkBps ? 'link' : win <= loss ? 'window' : 'loss';

  return {
    bdpBytes: bandwidthDelayProduct(linkBps, rttMs),
    windowLimitedBps: win,
    lossLimitedBps: loss,
    effectiveBps: effective,
    limitedBy,
    streamsToFillLink: effective > 0 ? Math.max(1, Math.ceil(linkBps / effective)) : Infinity,
    linkUtilisationPercent: linkBps > 0 ? Math.min(100, (effective / linkBps) * 100) : 0,
  };
}

/** Human-readable bit rate: 2.26 Mbps, 940 Mbps, 1.2 Gbps. */
export function formatBps(bps: number): string {
  if (!Number.isFinite(bps)) return 'unlimited';
  const units: [number, string][] = [
    [1e9, 'Gbps'],
    [1e6, 'Mbps'],
    [1e3, 'kbps'],
  ];
  for (const [size, label] of units) {
    if (bps >= size) {
      const n = bps / size;
      return `${n >= 100 ? Math.round(n) : Number(n.toPrecision(3))} ${label}`;
    }
  }
  return `${Math.round(bps)} bps`;
}

/** Bytes as KiB / MiB / GiB, for the bandwidth delay product. */
export function formatBytes(bytes: number): string {
  const units: [number, string][] = [
    [1024 ** 3, 'GiB'],
    [1024 ** 2, 'MiB'],
    [1024, 'KiB'],
  ];
  for (const [size, label] of units) {
    if (bytes >= size) {
      const n = bytes / size;
      return `${n >= 100 ? Math.round(n) : Number(n.toPrecision(3))} ${label}`;
    }
  }
  return `${Math.round(bytes)} bytes`;
}
