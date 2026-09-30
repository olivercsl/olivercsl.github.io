import { describe, it, expect } from 'vitest';
import qrcode from 'qrcode-generator';
import {
  toSvg,
  moduleDimension,
  withinCapacity,
  buildPayload,
  normaliseUrl,
  cleanPhone,
  alignmentPatterns,
  DEFAULT_QR_OPTIONS,
} from './qr';

const opts = DEFAULT_QR_OPTIONS;

describe('toSvg', () => {
  it('produces a well-formed svg', () => {
    const svg = toSvg('https://cloudzeta.solutions', opts);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox="0 0');
  });

  it('applies the chosen colours', () => {
    const svg = toSvg('hello', { ...opts, fg: '#123456', bg: '#abcdef' });
    expect(svg).toContain('fill="#abcdef"'); // background rect
    expect(svg).toContain('fill="#123456"'); // module group
  });

  it('includes the quiet-zone margin in the viewBox', () => {
    const dim = moduleDimension('hello', opts);
    expect(toSvg('hello', opts)).toContain(`viewBox="0 0 ${dim} ${dim}"`);
    // margin is applied on both sides
    const noMargin = moduleDimension('hello', { ...opts, margin: 0 });
    expect(dim).toBe(noMargin + opts.margin * 2);
  });

  it('draws at least one module', () => {
    expect((toSvg('hello', opts).match(/<rect/g) ?? []).length).toBeGreaterThan(1);
  });

  it('grows the matrix as more data is encoded', () => {
    const small = moduleDimension('a', opts);
    const large = moduleDimension('a'.repeat(400), opts);
    expect(large).toBeGreaterThan(small);
  });

  it('is deterministic for the same input', () => {
    expect(toSvg('cloudzeta', opts)).toBe(toSvg('cloudzeta', opts));
  });
});

describe('withinCapacity', () => {
  it('accepts normal input', () => {
    expect(withinCapacity('https://cloudzeta.solutions/tools/qr-code-generator', 'M')).toBe(true);
  });

  it('rejects input beyond a single QR symbol', () => {
    expect(withinCapacity('x'.repeat(3000), 'H')).toBe(false);
    expect(withinCapacity('x'.repeat(3000), 'M')).toBe(false);
  });

  it('allows more data at lower error correction', () => {
    const text = 'x'.repeat(1300);
    expect(withinCapacity(text, 'L')).toBe(true);
    expect(withinCapacity(text, 'H')).toBe(false);
  });

  it('counts bytes, not characters, for multibyte input', () => {
    // Each emoji is 4 UTF-8 bytes; 800 of them exceed H's 1273-byte budget.
    expect(withinCapacity('😀'.repeat(800), 'H')).toBe(false);
  });
});

describe('UTF-8', () => {
  it('encodes non-Latin text as UTF-8 bytes, not truncated UTF-16', () => {
    // The library default keeps only the low byte of each char: 'é' (U+00E9)
    // happens to survive, '中' (U+4E2D) becomes 0x2D, a hyphen.
    expect(qrcode.stringToBytes('中')).toEqual([0xe4, 0xb8, 0xad]);
    expect(qrcode.stringToBytes('café')).toEqual([0x63, 0x61, 0x66, 0xc3, 0xa9]);
  });
});

describe('styles, transparency and logo', () => {
  it('draws dots as circles and keeps the finders solid', () => {
    const svg = toSvg('hello', { ...opts, style: 'dots' });
    expect(svg).toContain('<circle');
    expect(svg).toContain('fill-rule="evenodd"');
  });

  it('draws rounded modules', () => {
    expect(toSvg("hello", { ...opts, style: "rounded" })).toMatch(/<path d="M[^"]*A0.5/);
  });

  it('omits the background when transparent', () => {
    const svg = toSvg('hello', { ...opts, bg: '#abcdef', transparent: true });
    expect(svg).not.toContain('fill="#abcdef"');
  });

  it('clears modules under the logo and embeds the image', () => {
    const plain = toSvg('https://cloudzeta.solutions', { ...opts, ecc: 'H' });
    const withLogo = toSvg('https://cloudzeta.solutions', {
      ...opts,
      ecc: 'H',
      logo: { href: 'data:image/png;base64,AAAA', scale: 0.22 },
    });
    expect(withLogo).toContain('<image href="data:image/png;base64,AAAA"');
    const count = (s: string) => (s.match(/<rect x=/g) ?? []).length;
    expect(count(withLogo)).toBeLessThan(count(plain));
  });

  it('caps the logo at the maximum scale', () => {
    const big = toSvg('hello', { ...opts, ecc: 'H', logo: { href: 'x', scale: 0.9 } });
    const capped = toSvg('hello', { ...opts, ecc: 'H', logo: { href: 'x', scale: 0.3 } });
    expect(big).toBe(capped);
  });

  it('escapes quotes in the logo URL', () => {
    expect(toSvg('hello', { ...opts, logo: { href: 'a"b', scale: 0.2 } })).toContain('a&quot;b');
  });
});

describe('payloads', () => {
  it('adds https:// to a bare domain so cameras open it', () => {
    expect(normaliseUrl('example.com')).toEqual({ url: 'https://example.com', added: true });
    expect(normaliseUrl('example.co.uk/menu?t=1')).toEqual({ url: 'https://example.co.uk/menu?t=1', added: true });
    expect(normaliseUrl('http://example.com').added).toBe(false);
    expect(normaliseUrl('hello world').added).toBe(false);
  });

  it('builds a Wi-Fi code with escaping', () => {
    expect(buildPayload('wifi', { ssid: 'Cafe;Guest', password: 'p:a"ss', security: 'WPA' })).toBe(
      'WIFI:T:WPA;S:Cafe\\;Guest;P:p\\:a\\"ss;;',
    );
  });

  it('leaves the password out of an open network and flags hidden ones', () => {
    expect(buildPayload('wifi', { ssid: 'Lobby', security: 'nopass', hidden: true })).toBe(
      'WIFI:T:nopass;S:Lobby;H:true;;',
    );
  });

  it('builds mailto with encoded subject and body', () => {
    expect(buildPayload('email', { email: 'a@b.co', subject: 'Hi there', body: 'Line & more' })).toBe(
      'mailto:a@b.co?subject=Hi%20there&body=Line%20%26%20more',
    );
    expect(buildPayload('email', { email: 'a@b.co' })).toBe('mailto:a@b.co');
  });

  it('cleans phone numbers for tel and SMS', () => {
    expect(cleanPhone('+61 (2) 9000-1234')).toBe('+61290001234');
    expect(buildPayload('phone', { phone: '+61 2 9000 1234' })).toBe('tel:+61290001234');
    expect(buildPayload('sms', { phone: '0412 345 678', message: 'Table 4' })).toBe('SMSTO:0412345678:Table 4');
  });

  it('builds a vCard with escaped fields', () => {
    const v = buildPayload('contact', {
      firstName: 'Ana',
      lastName: 'Silva',
      org: 'Acme, Inc',
      phone: '+1 555 0100',
      email: 'ana@acme.test',
      website: 'acme.test',
    });
    expect(v.split('\r\n')).toEqual([
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Silva;Ana;;;',
      'FN:Ana Silva',
      'ORG:Acme\\, Inc',
      'TEL;TYPE=CELL:+15550100',
      'EMAIL:ana@acme.test',
      'URL:https://acme.test',
      'END:VCARD',
    ]);
  });

  it('returns nothing until the required field is filled', () => {
    expect(buildPayload('wifi', { password: 'x' })).toBe('');
    expect(buildPayload('email', {})).toBe('');
    expect(buildPayload('phone', { phone: '+' })).toBe('');
    expect(buildPayload('contact', { org: 'Acme' })).toBe('');
    expect(buildPayload('text', { text: '   ' })).toBe('');
  });
});

describe('alignment patterns', () => {
  // Check the table against real symbols: every listed pattern must show the
  // 5x5 signature of dark ring, light ring, dark centre in the encoded matrix.
  it('finds real alignment patterns in symbols of many versions', () => {
    for (const len of [20, 60, 120, 300, 700, 1200]) {
      const qr = qrcode(0, 'M');
      qr.addData('x'.repeat(len));
      qr.make();
      const n = qr.getModuleCount();
      const found = alignmentPatterns(n);
      if (n > 21) expect(found.length).toBeGreaterThan(0);
      for (const [r, c] of found) {
        for (let i = 0; i < 5; i++) {
          for (let j = 0; j < 5; j++) {
            const ring = Math.max(Math.abs(i - 2), Math.abs(j - 2));
            expect(qr.isDark(r + i, c + j)).toBe(ring !== 1);
          }
        }
      }
    }
  });
});
