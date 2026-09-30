/**
 * QR rendering and payloads.
 *
 * Encoding (Reed-Solomon, masking, bit placement) is delegated to
 * qrcode-generator, a dependency-free, widely-used implementation. Getting
 * that wrong by hand is easy and invisible until someone's scanner fails, so we
 * do not reinvent it. What lives here is the rendering (turning the module
 * matrix into an SVG we control the colours, shapes and quiet zone of) and the
 * payload formats phones understand for Wi-Fi, contacts, email, calls and SMS.
 *
 * Everything runs in the browser. Nothing about the encoded content is sent
 * anywhere, and a link is encoded as itself, with no tracking redirect.
 */
import qrcode from 'qrcode-generator';

// The library's default byte conversion keeps only the low 8 bits of each
// UTF-16 unit, which silently corrupts anything outside Latin-1: an accented
// Wi-Fi name, a Chinese contact name, an emoji. Encode as UTF-8 instead, which
// is what every phone scanner expects in byte mode.
qrcode.stringToBytes = (s: string) => Array.from(new TextEncoder().encode(s));

/** Error-correction level: higher tolerates more damage but packs less data. */
export type EccLevel = 'L' | 'M' | 'Q' | 'H';

export const ECC_LEVELS: { id: EccLevel; label: string; recovery: string }[] = [
  { id: 'L', label: 'Low', recovery: '~7%' },
  { id: 'M', label: 'Medium', recovery: '~15%' },
  { id: 'Q', label: 'Quartile', recovery: '~25%' },
  { id: 'H', label: 'High', recovery: '~30%' },
];

export type ModuleStyle = 'square' | 'rounded' | 'dots';

export interface QrLogo {
  /** Image URL, normally a data: URL made from the user's file. */
  href: string;
  /** Logo width as a fraction of the code's width, excluding the quiet zone. */
  scale: number;
}

export interface QrOptions {
  ecc: EccLevel;
  fg: string;
  bg: string;
  /** Quiet-zone width in modules. The spec asks for 4. */
  margin: number;
  style?: ModuleStyle;
  /** Leave the background out entirely, for placing on artwork. */
  transparent?: boolean;
  logo?: QrLogo | null;
}

export const DEFAULT_QR_OPTIONS: QrOptions = {
  ecc: 'M',
  fg: '#1d1d1f',
  bg: '#ffffff',
  margin: 4,
  style: 'square',
  transparent: false,
  logo: null,
};

/**
 * Largest logo we allow, as a fraction of width. At 0.3 the covered area is
 * about 9% of the symbol plus padding, comfortably inside the 30% that level
 * H can recover, with room left for real-world damage.
 */
export const MAX_LOGO_SCALE = 0.3;

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
 * Centre coordinates of the alignment patterns for each version, from ISO/IEC
 * 18004 Annex E. Index 0 is unused; version 1 has none.
 */
const ALIGNMENT_POSITIONS: number[][] = [
  [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62],
  [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
  [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114], [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170],
];

/** Top-left corners of every 5x5 alignment pattern in a symbol of this size. */
export function alignmentPatterns(count: number): [number, number][] {
  const version = (count - 17) / 4;
  const pos = ALIGNMENT_POSITIONS[version] ?? [];
  const out: [number, number][] = [];
  for (const r of pos) {
    for (const c of pos) {
      // Skip the three that would sit on a finder pattern.
      const onFinder = (r === 6 && c === 6) || (r === 6 && c === pos.at(-1)) || (r === pos.at(-1) && c === 6);
      if (!onFinder) out.push([r - 2, c - 2]);
    }
  }
  return out;
}

/** True for modules inside one of the three 7x7 finder patterns. */
function inFinder(r: number, c: number, count: number): boolean {
  const near = (v: number) => v < 7;
  const far = (v: number) => v >= count - 7;
  return (near(r) && near(c)) || (near(r) && far(c)) || (far(r) && near(c));
}

/** Rounded rectangle as a path, clockwise, so evenodd can punch holes. */
function roundRect(x: number, y: number, w: number, h: number, r: number): string {
  return (
    `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}` +
    `a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}` +
    `v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`
  );
}

/**
 * Render as SVG. The viewBox is in module units so the consumer scales without
 * re-rendering.
 *
 * Square style keeps one rect per dark module. The rounded and dot styles draw
 * data modules as shapes and the three finder patterns as solid rounded
 * squares, because scanners locate the code by those patterns and a finder
 * made of loose dots is the usual reason a styled code fails to read.
 */
export function toSvg(text: string, opts: QrOptions): string {
  const { count, isDark } = build(text, opts.ecc);
  const m = opts.margin;
  const dim = count + m * 2;
  const style = opts.style ?? 'square';

  // Logo area: a square at the centre, padded by half a module each side,
  // with the modules underneath left out so the logo sits on clean background.
  let logoBox: { x: number; w: number } | null = null;
  if (opts.logo && opts.logo.href) {
    const w = Math.min(opts.logo.scale, MAX_LOGO_SCALE) * count;
    logoBox = { x: m + (count - w) / 2, w };
  }
  const underLogo = (r: number, c: number) => {
    if (!logoBox) return false;
    const lo = logoBox.x - 0.5;
    const hi = logoBox.x + logoBox.w + 0.5;
    const x = c + m + 0.5;
    const y = r + m + 0.5;
    return x > lo && x < hi && y > lo && y < hi;
  };

  // Styled renderings draw alignment patterns whole, like the finders: loose
  // dots there cost dense codes their readability.
  const aligns = style === 'square' ? [] : alignmentPatterns(count);
  const inAlign = (r: number, c: number) => aligns.some(([ar, ac]) => r >= ar && r < ar + 5 && c >= ac && c < ac + 5);

  // Rounded style joins each module to its dark neighbours and rounds only the
  // corners with nothing next to them, so the code has no gaps between
  // modules. Gaps are what make styled codes fail on dense symbols.
  const dark = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < count && c < count && isDark(r, c) && !underLogo(r, c) &&
    !inFinder(r, c, count) && !inAlign(r, c);
  const roundedModule = (x: number, y: number, r: number, c: number) => {
    const up = dark(r - 1, c), down = dark(r + 1, c), left = dark(r, c - 1), right = dark(r, c + 1);
    const k = 0.5;
    const tl = !up && !left ? k : 0, tr = !up && !right ? k : 0;
    const br = !down && !right ? k : 0, bl = !down && !left ? k : 0;
    return (
      `M${x + tl} ${y}H${x + 1 - tr}` + (tr ? `A${k} ${k} 0 0 1 ${x + 1} ${y + tr}` : '') +
      `V${y + 1 - br}` + (br ? `A${k} ${k} 0 0 1 ${x + 1 - br} ${y + 1}` : '') +
      `H${x + bl}` + (bl ? `A${k} ${k} 0 0 1 ${x} ${y + 1 - bl}` : '') +
      `V${y + tl}` + (tl ? `A${k} ${k} 0 0 1 ${x + tl} ${y}` : '') + 'Z'
    );
  };
  let rounded = '';

  let body = '';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!isDark(r, c) || underLogo(r, c)) continue;
      if (style !== 'square' && (inFinder(r, c, count) || inAlign(r, c))) continue;
      const x = c + m;
      const y = r + m;
      // Slightly larger than the module so neighbours overlap. Dots with gaps
      // between them looked lighter but failed on dense codes in testing.
      if (style === 'dots') body += `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.55"/>`;
      else if (style === 'rounded') rounded += roundedModule(x, y, r, c);
      else body += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
  }

  if (rounded) body += `<path d="${rounded}"/>`;

  if (style !== 'square') {
    // Each finder: a 7x7 ring (outer minus 5x5 hole) and a 3x3 centre.
    let eyes = '';
    for (const [er, ec] of [
      [0, 0],
      [0, count - 7],
      [count - 7, 0],
    ] as const) {
      const x = ec + m;
      const y = er + m;
      eyes += roundRect(x, y, 7, 7, 1.6) + roundRect(x + 1, y + 1, 5, 5, 1.1) + roundRect(x + 2, y + 2, 3, 3, 0.8);
    }
    for (const [ar, ac] of aligns) {
      const x = ac + m;
      const y = ar + m;
      eyes += roundRect(x, y, 5, 5, 1.2) + roundRect(x + 1, y + 1, 3, 3, 0.7) + roundRect(x + 2, y + 2, 1, 1, 0.3);
    }
    body += `<path fill-rule="evenodd" d="${eyes}"/>`;
  }

  let logo = '';
  if (logoBox && opts.logo) {
    const pad = logoBox.x - 0.5;
    const size = logoBox.w + 1;
    if (!opts.transparent) {
      logo += `<rect x="${pad}" y="${pad}" width="${size}" height="${size}" rx="${size * 0.12}" fill="${opts.bg}"/>`;
    }
    logo +=
      `<image href="${escapeAttr(opts.logo.href)}" x="${logoBox.x}" y="${logoBox.x}" ` +
      `width="${logoBox.w}" height="${logoBox.w}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}"` +
    (style === 'square' ? ' shape-rendering="crispEdges"' : '') +
    `>` +
    (opts.transparent ? '' : `<rect width="${dim}" height="${dim}" fill="${opts.bg}"/>`) +
    `<g fill="${opts.fg}">${body}</g>` +
    logo +
    `</svg>`
  );
}

/** Total module dimension including the quiet zone, for sizing the canvas. */
export function moduleDimension(text: string, opts: QrOptions): number {
  return build(text, opts.ecc).count + opts.margin * 2;
}

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* ------------------------------------------------------------------------ */
/*  Payloads: what to encode so a phone camera offers the right action.     */
/* ------------------------------------------------------------------------ */

export type PayloadKind = 'link' | 'text' | 'wifi' | 'email' | 'phone' | 'sms' | 'contact';

export const PAYLOAD_KINDS: { id: PayloadKind; label: string }[] = [
  { id: 'link', label: 'Link' },
  { id: 'text', label: 'Text' },
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'sms', label: 'SMS' },
  { id: 'contact', label: 'Contact' },
];

export type WifiSecurity = 'WPA' | 'WEP' | 'nopass';

export interface PayloadFields {
  url?: string;
  text?: string;
  ssid?: string;
  password?: string;
  security?: WifiSecurity;
  hidden?: boolean;
  email?: string;
  subject?: string;
  body?: string;
  phone?: string;
  message?: string;
  firstName?: string;
  lastName?: string;
  org?: string;
  title?: string;
  website?: string;
}

/**
 * A link typed without a scheme ("example.com") is often read as plain text
 * by phone cameras, so it shows up as a search rather than opening. Add
 * https:// when the input looks like a bare domain.
 */
export function normaliseUrl(input: string): { url: string; added: boolean } {
  const s = input.trim();
  if (!s) return { url: '', added: false };
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return { url: s, added: false };
  if (/^[^\s/]+\.[a-z]{2,}([/:?#].*)?$/i.test(s)) return { url: `https://${s}`, added: true };
  return { url: s, added: false };
}

/** Wi-Fi fields escape \ ; , : and " with a backslash (ZXing convention). */
const wifiEscape = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');

/** vCard text values escape backslash, comma, semicolon and newlines. */
const vcardEscape = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\r?\n/g, '\\n');

/** Keep a leading plus and the digits; drop spaces, dashes and brackets. */
export const cleanPhone = (s: string) => {
  const t = s.trim();
  return (t.startsWith('+') ? '+' : '') + t.replace(/[^\d]/g, '');
};

/** The string to encode for a given kind, or '' when required fields are empty. */
export function buildPayload(kind: PayloadKind, f: PayloadFields): string {
  switch (kind) {
    case 'link':
      return normaliseUrl(f.url ?? '').url;
    case 'text':
      return (f.text ?? '').trim() ? (f.text ?? '') : '';
    case 'wifi': {
      const ssid = f.ssid ?? '';
      if (!ssid) return '';
      const sec = f.security ?? 'WPA';
      let s = `WIFI:T:${sec};S:${wifiEscape(ssid)};`;
      if (sec !== 'nopass') s += `P:${wifiEscape(f.password ?? '')};`;
      if (f.hidden) s += 'H:true;';
      return s + ';';
    }
    case 'email': {
      const to = (f.email ?? '').trim();
      if (!to) return '';
      const q: string[] = [];
      if (f.subject) q.push(`subject=${encodeURIComponent(f.subject)}`);
      if (f.body) q.push(`body=${encodeURIComponent(f.body)}`);
      return `mailto:${to}${q.length ? `?${q.join('&')}` : ''}`;
    }
    case 'phone': {
      const n = cleanPhone(f.phone ?? '');
      return n.replace('+', '') ? `tel:${n}` : '';
    }
    case 'sms': {
      const n = cleanPhone(f.phone ?? '');
      if (!n.replace('+', '')) return '';
      return `SMSTO:${n}:${f.message ?? ''}`;
    }
    case 'contact': {
      const first = (f.firstName ?? '').trim();
      const last = (f.lastName ?? '').trim();
      if (!first && !last) return '';
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${vcardEscape(last)};${vcardEscape(first)};;;`,
        `FN:${vcardEscape([first, last].filter(Boolean).join(' '))}`,
      ];
      if (f.org?.trim()) lines.push(`ORG:${vcardEscape(f.org.trim())}`);
      if (f.title?.trim()) lines.push(`TITLE:${vcardEscape(f.title.trim())}`);
      if (f.phone && cleanPhone(f.phone).replace('+', '')) lines.push(`TEL;TYPE=CELL:${cleanPhone(f.phone)}`);
      if (f.email?.trim()) lines.push(`EMAIL:${f.email.trim()}`);
      if (f.website?.trim()) lines.push(`URL:${normaliseUrl(f.website).url}`);
      lines.push('END:VCARD');
      return lines.join('\r\n');
    }
  }
}
