import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  toSvg,
  withinCapacity,
  buildPayload,
  normaliseUrl,
  ECC_LEVELS,
  PAYLOAD_KINDS,
  DEFAULT_QR_OPTIONS,
  MAX_LOGO_SCALE,
  type QrOptions,
  type EccLevel,
  type ModuleStyle,
  type PayloadKind,
  type PayloadFields,
  type WifiSecurity,
} from '../../lib/qr';

const PRESETS: { name: string; fg: string; bg: string }[] = [
  { name: 'Classic', fg: '#1d1d1f', bg: '#ffffff' },
  { name: 'Ocean', fg: '#0071e3', bg: '#ffffff' },
  { name: 'Forest', fg: '#0a7c4a', bg: '#ffffff' },
  { name: 'Grape', fg: '#6d28d9', bg: '#ffffff' },
  { name: 'Brick', fg: '#b3261e', bg: '#fff8f0' },
  { name: 'Inverted', fg: '#ffffff', bg: '#1d1d1f' },
];

const STYLES: { id: ModuleStyle; label: string }[] = [
  { id: 'square', label: 'Square' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'dots', label: 'Dots' },
];

const PNG_SIZES = [512, 1024, 2048];

/** Relative luminance, to warn when fg/bg are too close for scanners. */
function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0;
  const n = parseInt(m[1]!, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** Draw the SVG onto a square canvas, optionally over a solid backing colour. */
async function rasterise(svg: string, px: number, backing: string | null): Promise<HTMLCanvasElement> {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('render failed'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = px;
    const ctx = canvas.getContext('2d')!;
    if (backing) {
      ctx.fillStyle = backing;
      ctx.fillRect(0, 0, px, px);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, px, px);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Shrink an uploaded logo to at most 256px and return it as a PNG data URL. */
async function logoToDataUrl(file: File): Promise<string> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('bad image'));
      img.src = url;
    });
    const w = img.naturalWidth || 256;
    const h = img.naturalHeight || 256;
    const k = Math.min(1, 256 / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * k);
    canvas.height = Math.round(h * k);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

type ScanState = 'unsupported' | 'checking' | 'pass' | 'fail';

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-glass-border bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all text-sm';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-xs font-medium text-tx-secondary mb-1">{label}</span>
    {children}
  </label>
);

export const QrGenerator = () => {
  const [kind, setKind] = useState<PayloadKind>('link');
  const [fields, setFields] = useState<PayloadFields>({ url: 'https://cloudzeta.solutions', security: 'WPA' });
  const [opts, setOpts] = useState<QrOptions>(DEFAULT_QR_OPTIONS);
  const [logoScale, setLogoScale] = useState(0.22);
  const [logoHref, setLogoHref] = useState<string | null>(null);
  const [pngSize, setPngSize] = useState(1024);
  const [scan, setScan] = useState<ScanState>('checking');
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: PayloadFields) => setFields((f) => ({ ...f, ...patch }));

  const payload = buildPayload(kind, fields);
  const addedScheme = kind === 'link' && normaliseUrl(fields.url ?? '').added;
  const tooLong = payload !== '' && !withinCapacity(payload, opts.ecc);
  const lowContrast = contrastRatio(opts.fg, opts.bg) < 2.5;
  const inverted = !opts.transparent && luminance(opts.fg) > luminance(opts.bg);

  const renderOpts: QrOptions = useMemo(
    () => ({ ...opts, logo: logoHref ? { href: logoHref, scale: logoScale } : null }),
    [opts, logoHref, logoScale],
  );

  const svg = useMemo(() => {
    if (!payload || tooLong) return '';
    try {
      return toSvg(payload, renderOpts);
    } catch {
      return '';
    }
  }, [payload, renderOpts, tooLong]);

  // For a transparent code, check it against the kind of surface it is
  // designed for: dark modules on white, light modules on black.
  const backing = opts.transparent ? (luminance(opts.fg) < 0.4 ? '#ffffff' : '#000000') : null;

  // Scan check: read the code back with the browser's own QR detector, where
  // one exists (Chrome on Mac, Android and ChromeOS, and others over time).
  useEffect(() => {
    const Detector = (globalThis as { BarcodeDetector?: new (o: object) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (!Detector) {
      setScan('unsupported');
      return;
    }
    if (!svg) return;
    let cancelled = false;
    setScan('checking');
    const t = setTimeout(async () => {
      try {
        const canvas = await rasterise(svg, 600, backing);
        const found = await new Detector({ formats: ['qr_code'] }).detect(canvas);
        if (!cancelled) setScan(found.some((r) => r.rawValue === payload) ? 'pass' : 'fail');
      } catch {
        if (!cancelled) setScan('unsupported');
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [svg, payload, backing]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSvg = () => {
    if (!svg) return;
    downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'qr-code.svg');
    setToast('SVG downloaded');
  };

  const downloadPng = async () => {
    if (!svg) return;
    try {
      const canvas = await rasterise(svg, pngSize, null);
      const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      if (blob) {
        downloadBlob(blob, `qr-code-${pngSize}.png`);
        setToast('PNG downloaded');
      }
    } catch {
      setToast('Could not render PNG. Try SVG instead.');
    }
  };

  const onLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      setLogoHref(await logoToDataUrl(file));
      // A logo hides part of the code, so give it the most redundancy.
      setOpts((o) => ({ ...o, ecc: 'H' }));
    } catch {
      setToast('Could not read that image.');
    }
  };

  const removeLogo = () => {
    setLogoHref(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const emptyHint: Record<PayloadKind, string> = {
    link: 'Enter a link to see your QR code.',
    text: 'Enter some text to see your QR code.',
    wifi: 'Enter the network name to see your QR code.',
    email: 'Enter an email address to see your QR code.',
    phone: 'Enter a phone number to see your QR code.',
    sms: 'Enter a phone number to see your QR code.',
    contact: 'Enter a name to see your QR code.',
  };

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden grid lg:grid-cols-2">
      {/* Controls */}
      <div className="p-5 md:p-6 lg:border-r border-glass-border min-w-0">
        {/* What to encode */}
        <div role="tablist" aria-label="What the QR code contains" className="flex flex-wrap gap-1.5 mb-4">
          {PAYLOAD_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="tab"
              aria-selected={kind === k.id}
              onClick={() => setKind(k.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                kind === k.id
                  ? 'bg-tx-primary text-white border-tx-primary'
                  : 'bg-white text-tx-secondary border-glass-border hover:text-tx-primary hover:border-accent/40'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {kind === 'link' && (
            <>
              <Field label="Link">
                <input
                  type="url"
                  inputMode="url"
                  value={fields.url ?? ''}
                  onChange={(e) => set({ url: e.target.value })}
                  placeholder="https://example.com"
                  className={`${inputCls} font-mono`}
                />
              </Field>
              {addedScheme && (
                <p className="text-xs text-tx-secondary">
                  Added https:// so phone cameras open it as a link rather than searching for it.
                </p>
              )}
            </>
          )}
          {kind === 'text' && (
            <Field label="Text">
              <textarea
                value={fields.text ?? ''}
                onChange={(e) => set({ text: e.target.value })}
                rows={3}
                placeholder="Any text"
                className={`${inputCls} resize-none`}
              />
            </Field>
          )}
          {kind === 'wifi' && (
            <>
              <Field label="Network name (SSID)">
                <input value={fields.ssid ?? ''} onChange={(e) => set({ ssid: e.target.value })} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Security">
                  <select
                    value={fields.security ?? 'WPA'}
                    onChange={(e) => set({ security: e.target.value as WifiSecurity })}
                    className={inputCls}
                  >
                    <option value="WPA">WPA, WPA2 or WPA3</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">None (open)</option>
                  </select>
                </Field>
                {fields.security !== 'nopass' && (
                  <Field label="Password">
                    <input
                      value={fields.password ?? ''}
                      onChange={(e) => set({ password: e.target.value })}
                      autoComplete="off"
                      className={`${inputCls} font-mono`}
                    />
                  </Field>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-tx-secondary">
                <input type="checkbox" checked={!!fields.hidden} onChange={(e) => set({ hidden: e.target.checked })} />
                Hidden network
              </label>
            </>
          )}
          {kind === 'email' && (
            <>
              <Field label="Email address">
                <input type="email" value={fields.email ?? ''} onChange={(e) => set({ email: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Subject (optional)">
                <input value={fields.subject ?? ''} onChange={(e) => set({ subject: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Message (optional)">
                <textarea value={fields.body ?? ''} onChange={(e) => set({ body: e.target.value })} rows={2} className={`${inputCls} resize-none`} />
              </Field>
            </>
          )}
          {(kind === 'phone' || kind === 'sms') && (
            <>
              <Field label="Phone number, with country code">
                <input
                  type="tel"
                  value={fields.phone ?? ''}
                  onChange={(e) => set({ phone: e.target.value })}
                  placeholder="+61 2 9000 1234"
                  className={`${inputCls} font-mono`}
                />
              </Field>
              {kind === 'sms' && (
                <Field label="Message (optional)">
                  <textarea value={fields.message ?? ''} onChange={(e) => set({ message: e.target.value })} rows={2} className={`${inputCls} resize-none`} />
                </Field>
              )}
            </>
          )}
          {kind === 'contact' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <input value={fields.firstName ?? ''} onChange={(e) => set({ firstName: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Last name">
                  <input value={fields.lastName ?? ''} onChange={(e) => set({ lastName: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Company">
                  <input value={fields.org ?? ''} onChange={(e) => set({ org: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Job title">
                  <input value={fields.title ?? ''} onChange={(e) => set({ title: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Phone">
                  <input type="tel" value={fields.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Email">
                  <input type="email" value={fields.email ?? ''} onChange={(e) => set({ email: e.target.value })} className={inputCls} />
                </Field>
              </div>
              <Field label="Website">
                <input value={fields.website ?? ''} onChange={(e) => set({ website: e.target.value })} className={inputCls} />
              </Field>
            </>
          )}
        </div>

        {tooLong && (
          <p className="mt-2 text-sm text-red-600">
            Too much data for one QR code at this error-correction level. Shorten it or lower the level.
          </p>
        )}

        {/* Colours */}
        <div className="mt-6">
          <span className="block text-sm font-semibold text-tx-primary mb-3">Colours</span>
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setOpts({ ...opts, fg: p.fg, bg: p.bg })}
                aria-label={`${p.name} colour preset`}
                className={`w-8 h-8 rounded-lg border shadow-sm transition-transform hover:scale-110 ${
                  opts.fg === p.fg && opts.bg === p.bg ? 'ring-2 ring-accent ring-offset-1' : 'border-glass-border'
                }`}
                style={{ background: `linear-gradient(135deg, ${p.fg} 50%, ${p.bg} 50%)` }}
                title={p.name}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {(['fg', 'bg'] as const).map((k) => (
              <label
                key={k}
                className={`flex items-center gap-2 text-sm text-tx-secondary ${k === 'bg' && opts.transparent ? 'opacity-40' : ''}`}
              >
                <input
                  type="color"
                  value={opts[k]}
                  disabled={k === 'bg' && opts.transparent}
                  onChange={(e) => setOpts({ ...opts, [k]: e.target.value })}
                  aria-label={k === 'fg' ? 'Foreground colour' : 'Background colour'}
                  className="w-9 h-9 rounded-lg border border-glass-border cursor-pointer bg-white"
                />
                {k === 'fg' ? 'Foreground' : 'Background'}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm text-tx-secondary">
              <input
                type="checkbox"
                checked={!!opts.transparent}
                onChange={(e) => setOpts({ ...opts, transparent: e.target.checked })}
              />
              Transparent background
            </label>
          </div>
          {!opts.transparent && lowContrast && (
            <p className="mt-3 text-sm text-amber-600">
              Low contrast between colours. Some scanners may struggle. Keep the code darker than its background.
            </p>
          )}
          {inverted && !lowContrast && (
            <p className="mt-3 text-sm text-amber-600">
              Light code on a dark background. Most phone cameras read it, but some older scanner apps do not.
            </p>
          )}
        </div>

        {/* Style */}
        <div className="mt-6">
          <span className="block text-sm font-semibold text-tx-primary mb-3">Style</span>
          <div className="grid grid-cols-3 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={(opts.style ?? 'square') === s.id}
                onClick={() => setOpts({ ...opts, style: s.id })}
                className={`px-2 py-2 rounded-lg border text-sm font-semibold text-tx-primary transition-all ${
                  (opts.style ?? 'square') === s.id
                    ? 'bg-blue-50 border-accent ring-1 ring-accent/30'
                    : 'bg-white border-glass-border hover:border-accent/40'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logo */}
        <div className="mt-6">
          <span className="block text-sm font-semibold text-tx-primary mb-1">Logo</span>
          <p className="text-xs text-tx-secondary mb-3">
            Optional. Placed in the centre, with error correction set to High so the code still scans.
            The image stays in your browser.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => onLogo(e.target.files?.[0])}
              className="text-sm text-tx-secondary file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-glass-border file:bg-white file:text-sm file:font-medium file:text-tx-primary"
            />
            {logoHref && (
              <button type="button" onClick={removeLogo} className="text-sm text-tx-secondary hover:text-accent underline">
                Remove
              </button>
            )}
          </div>
          {logoHref && (
            <label className="flex items-center gap-3 mt-3 text-sm text-tx-secondary">
              Size
              <input
                type="range"
                min={0.1}
                max={MAX_LOGO_SCALE}
                step={0.01}
                value={logoScale}
                onChange={(e) => setLogoScale(Number(e.target.value))}
                className="flex-1"
              />
              <span className="font-mono text-xs w-10 text-right">{Math.round(logoScale * 100)}%</span>
            </label>
          )}
        </div>

        {/* Error correction */}
        <div className="mt-6">
          <span className="block text-sm font-semibold text-tx-primary mb-1">Error correction</span>
          <p className="text-xs text-tx-secondary mb-3">
            Higher levels stay scannable when the code is dirty or partly covered, but pack less data.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {ECC_LEVELS.map((lvl) => {
              const locked = !!logoHref && lvl.id !== 'H';
              return (
                <button
                  key={lvl.id}
                  type="button"
                  aria-pressed={opts.ecc === lvl.id}
                  disabled={locked}
                  title={locked ? 'A logo needs High error correction' : undefined}
                  onClick={() => setOpts({ ...opts, ecc: lvl.id as EccLevel })}
                  className={`px-2 py-2 rounded-lg border text-center transition-all disabled:opacity-40 ${
                    opts.ecc === lvl.id
                      ? 'bg-blue-50 border-accent ring-1 ring-accent/30'
                      : 'bg-white border-glass-border hover:border-accent/40'
                  }`}
                >
                  <span className="block text-sm font-semibold text-tx-primary">{lvl.label}</span>
                  <span className="block text-[11px] text-tx-secondary">{lvl.recovery}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preview + download */}
      <div className="p-5 md:p-6 flex flex-col items-center justify-center bg-surface/30">
        <div
          className="w-full max-w-[16rem] aspect-square rounded-2xl border border-glass-border p-3 shadow-sm flex items-center justify-center"
          style={
            opts.transparent
              ? {
                  backgroundColor: backing === '#000000' ? '#222' : '#fff',
                  backgroundImage:
                    'linear-gradient(45deg,rgba(128,128,128,.12) 25%,transparent 25%,transparent 75%,rgba(128,128,128,.12) 75%),linear-gradient(45deg,rgba(128,128,128,.12) 25%,transparent 25%,transparent 75%,rgba(128,128,128,.12) 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 8px 8px',
                }
              : { backgroundColor: '#fff' }
          }
        >
          {svg ? (
            <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <p className="text-sm text-tx-secondary text-center px-4">
              {tooLong ? 'Too much data. Shorten it.' : emptyHint[kind]}
            </p>
          )}
        </div>

        {svg && scan !== 'unsupported' && (
          <p
            role="status"
            className={`text-xs mt-3 text-center font-medium ${
              scan === 'pass' ? 'text-emerald-700' : scan === 'fail' ? 'text-red-600' : 'text-tx-secondary'
            }`}
          >
            {scan === 'checking' && 'Checking it scans...'}
            {scan === 'pass' && 'Scan check passed: reads back exactly.'}
            {scan === 'fail' &&
              'Scan check failed. Raise the contrast, shrink the logo or pick Square style.'}
          </p>
        )}

        <div className="flex flex-wrap justify-center items-center gap-2 mt-4 w-full">
          <button
            type="button"
            onClick={downloadPng}
            disabled={!svg}
            className="px-5 py-2.5 rounded-lg bg-tx-primary text-white text-sm font-semibold hover:bg-tx-primary/90 disabled:opacity-40"
          >
            Download PNG
          </button>
          <select
            value={pngSize}
            onChange={(e) => setPngSize(Number(e.target.value))}
            aria-label="PNG size in pixels"
            className="px-2 py-2.5 rounded-lg border border-glass-border bg-white text-sm text-tx-secondary"
          >
            {PNG_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}px
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={downloadSvg}
            disabled={!svg}
            className="px-5 py-2.5 rounded-lg border border-glass-border text-sm font-medium text-tx-secondary hover:text-tx-primary hover:border-accent/40 disabled:opacity-40"
          >
            Download SVG
          </button>
        </div>
        <p className="text-xs text-tx-secondary mt-3 text-center">
          {kind === 'link' ? 'Points straight at your link. No tracking redirect.' : 'Made in your browser. Nothing is sent anywhere.'}
        </p>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="toast-pop fixed bottom-6 left-1/2 z-50 px-5 py-3 rounded-full shadow-xl text-sm font-medium text-white bg-emerald-600"
        >
          {toast}
        </div>
      )}
    </div>
  );
};
