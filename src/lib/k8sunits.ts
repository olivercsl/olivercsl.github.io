/**
 * Kubernetes resource quantities: 500m, 1.5, 128Mi, 1G, 129e6.
 *
 * The grammar is small and the mistakes it invites are expensive:
 *
 *   Mi is not M.  128Mi is 134,217,728 bytes; 128M is 128,000,000. The binary
 *                 suffixes (Ki, Mi, Gi) are powers of 1024, the decimal ones
 *                 (k, M, G) powers of 1000, and the gap grows with size: about
 *                 7% at the gigabyte scale.
 *
 *   m means milli on everything. On CPU that is millicores, which is what you
 *                 want. On memory it is millibytes, so "memory: 128m" asks for
 *                 0.128 bytes and the API server accepts it without complaint.
 *                 This is the single most common resource typo in manifests.
 *
 *   Precision.    CPU cannot be finer than 1m. Anything smaller is rounded up.
 */

export type Kind = 'cpu' | 'memory';

const BINARY: Record<string, number> = {
  Ki: 1024,
  Mi: 1024 ** 2,
  Gi: 1024 ** 3,
  Ti: 1024 ** 4,
  Pi: 1024 ** 5,
  Ei: 1024 ** 6,
};

const DECIMAL: Record<string, number> = {
  n: 1e-9,
  u: 1e-6,
  m: 1e-3,
  '': 1,
  k: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
  P: 1e15,
  E: 1e18,
};

// Suffix alternation lists the two-letter binary forms first so "Mi" is not
// read as "M" followed by junk.
const QUANTITY =
  /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:(Ki|Mi|Gi|Ti|Pi|Ei)|([eE][+-]?\d+)|(n|u|m|k|M|G|T|P|E))?$/;

export interface Quantity {
  raw: string;
  /** Value in base units: cores for CPU, bytes for memory. */
  value: number;
  format: 'binary' | 'decimal' | 'exponent';
  suffix: string;
}

export function parseQuantity(input: string): Quantity | null {
  const raw = input.trim();
  const m = QUANTITY.exec(raw);
  if (!m) return null;

  const num = Number(m[1]);
  if (!Number.isFinite(num)) return null;

  if (m[2]) return { raw, value: num * BINARY[m[2]]!, format: 'binary', suffix: m[2] };
  if (m[3]) return { raw, value: num * 10 ** Number(m[3].slice(1)), format: 'exponent', suffix: m[3] };
  const suffix = m[4] ?? '';
  return { raw, value: num * DECIMAL[suffix]!, format: 'decimal', suffix };
}

export interface Finding {
  level: 'error' | 'warn' | 'info';
  message: string;
}

/** Things worth saying about a quantity given what it is being used for. */
export function findings(q: Quantity, kind: Kind): Finding[] {
  const out: Finding[] = [];

  if (q.value < 0) {
    out.push({ level: 'error', message: 'Resource quantities cannot be negative.' });
  }

  if (kind === 'memory') {
    if (q.suffix === 'm') {
      out.push({
        level: 'error',
        message: `"${q.raw}" is millibytes, ${fmtNumber(q.value)} bytes. You almost certainly meant ${q.raw.slice(0, -1)}Mi.`,
      });
    } else if (['n', 'u'].includes(q.suffix)) {
      out.push({ level: 'error', message: `"${q.raw}" is a fraction of a byte.` });
    } else if (q.value > 0 && q.value < 1024 * 1024) {
      out.push({
        level: 'warn',
        message: 'Under 1 MiB. No container runs in that; check the suffix.',
      });
    }
    if (q.format === 'decimal' && ['k', 'M', 'G', 'T'].includes(q.suffix)) {
      const binarySuffix = q.suffix === 'k' ? 'Ki' : `${q.suffix}i`;
      out.push({
        level: 'info',
        message: `Decimal suffix. ${q.raw} is ${fmtPercent(1 - q.value / (Number(q.raw.slice(0, -1)) * BINARY[binarySuffix]!))} smaller than ${q.raw.slice(0, -1)}${binarySuffix}.`,
      });
    }
  }

  if (kind === 'cpu') {
    const milli = q.value * 1000;
    if (q.value > 0 && milli < 1) {
      out.push({
        level: 'warn',
        message: 'Finer than 1m. Kubernetes rounds CPU up to the nearest millicore.',
      });
    } else if (Math.abs(milli - Math.round(milli)) > 1e-9) {
      out.push({
        level: 'warn',
        message: `Finer than 1m. Kubernetes will round this up to ${Math.ceil(milli)}m.`,
      });
    }
    if (['Ki', 'Mi', 'Gi', 'Ti', 'Pi', 'Ei', 'k', 'M', 'G', 'T', 'P', 'E'].includes(q.suffix)) {
      out.push({
        level: 'error',
        message: `"${q.raw}" is a memory-style suffix on CPU, ${fmtNumber(q.value)} cores.`,
      });
    }
  }

  return out;
}

/** CPU in the form a manifest would use: whole cores or millicores. */
export function formatCpu(cores: number): { millicores: string; cores: string } {
  const milli = Math.ceil(cores * 1000 - 1e-9);
  return {
    millicores: `${milli}m`,
    cores: Number((milli / 1000).toFixed(3)).toString(),
  };
}

/** Memory in the most readable binary and decimal forms, plus raw bytes. */
export function formatMemory(bytes: number): { binary: string; decimal: string; bytes: string } {
  return {
    binary: bestUnit(bytes, [
      ['Ei', 1024 ** 6],
      ['Pi', 1024 ** 5],
      ['Ti', 1024 ** 4],
      ['Gi', 1024 ** 3],
      ['Mi', 1024 ** 2],
      ['Ki', 1024],
    ]),
    decimal: bestUnit(bytes, [
      ['E', 1e18],
      ['P', 1e15],
      ['T', 1e12],
      ['G', 1e9],
      ['M', 1e6],
      ['k', 1e3],
    ]),
    bytes: fmtNumber(Math.round(bytes)),
  };
}

function bestUnit(value: number, units: [string, number][]): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  for (const [suffix, size] of units) {
    if (abs >= size) return `${sign}${Number((abs / size).toFixed(2))}${suffix}`;
  }
  return `${sign}${Number(abs.toFixed(3))}`;
}

const fmtNumber = (n: number) =>
  Math.abs(n) >= 1 ? n.toLocaleString('en-US', { maximumFractionDigits: 3 }) : String(Number(n.toPrecision(3)));

const fmtPercent = (f: number) => `${(f * 100).toFixed(1)}%`;

/** Presets for the quick-pick chips. */
export const PRESETS: Record<Kind, string[]> = {
  cpu: ['100m', '250m', '500m', '1', '1.5', '2'],
  memory: ['128Mi', '512Mi', '1Gi', '2Gi', '1G', '128m'],
};
