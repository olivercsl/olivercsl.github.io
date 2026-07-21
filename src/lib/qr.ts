/**
 * QR rendering.
 *
 * Encoding (Reed-Solomon, masking, bit placement) is delegated to
 * qrcode-generator — a dependency-free, widely-used implementation. Getting
 * that wrong by hand is easy and invisible until someone's scanner fails, so we
 * do not reinvent it. What lives here is only the rendering: turning the module
 * matrix into an SVG we control the colours and quiet zone of.
 *
 * Everything runs in the browser. Nothing about the encoded content is sent
 * anywhere, and the QR points straight at the user's URL — no tracking redirect.
 */
import qrcode from 'qrcode-generator';

/** Error-correction level: higher tolerates more damage but packs less data. */
export type EccLevel = 'L' | 'M' | 'Q' | 'H';

export const ECC_LEVELS: { id: EccLevel; label: string; recovery: string }[] = [
  { id: 'L', label: 'Low', recovery: '~7%' },
  { id: 'M', label: 'Medium', recovery: '~15%' },
  { id: 'Q', label: 'Quartile', recovery: '~25%' },
  { id: 'H', label: 'High', recovery: '~30%' },
];

export interface QrOptions {
  ecc: EccLevel;
  fg: string;
  bg: string;
  /** Quiet-zone width in modules. The spec asks for 4. */
  margin: number;
}

export const DEFAULT_QR_OPTIONS: QrOptions = { ecc: 'M', fg: '#1d1d1f', bg: '#ffffff', margin: 4 };

/** The most a single QR (version 40) holds at each ECC level, in bytes. */
const BYTE_CAPACITY: Record<EccLevel, number> = { L: 2953, M: 2331, Q: 1663, H: 1273 };

export function withinCapacity(text: string, ecc: EccLevel): boolean {
  return new TextEncoder().encode(text).length <= BYTE_CAPACITY[ecc];
}

interface Matrix {
  count: number;
  isDark: (row: number, col: number) => boolean;
}

/** Encode to a module matrix. Type 0 lets the library pick the smallest version. */
function build(text: string, ecc: EccLevel): Matrix {
  const qr = qrcode(0, ecc);
  qr.addData(text);
  qr.make();
  return { count: qr.getModuleCount(), isDark: (r, c) => qr.isDark(r, c) };
}

/**
 * Render as SVG. One filled rect per dark module — a single merged <path> would
 * be smaller, but per-rect keeps this readable and the sizes are trivial. The
 * viewBox is in module units so the consumer scales without re-rendering.
 */
export function toSvg(text: string, opts: QrOptions): string {
  const { count, isDark } = build(text, opts.ecc);
  const dim = count + opts.margin * 2;

  let rects = '';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (isDark(r, c)) {
        rects += `<rect x="${c + opts.margin}" y="${r + opts.margin}" width="1" height="1"/>`;
      }
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">` +
    `<rect width="${dim}" height="${dim}" fill="${opts.bg}"/>` +
    `<g fill="${opts.fg}">${rects}</g>` +
    `</svg>`
  );
}

/** Total module dimension including the quiet zone, for sizing the canvas. */
export function moduleDimension(text: string, opts: QrOptions): number {
  return build(text, opts.ecc).count + opts.margin * 2;
}
