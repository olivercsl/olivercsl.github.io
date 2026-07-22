import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  toSvg,
  withinCapacity,
  ECC_LEVELS,
  DEFAULT_QR_OPTIONS,
  type QrOptions,
  type EccLevel,
} from '../../lib/qr';

const PRESETS: { name: string; fg: string; bg: string }[] = [
  { name: 'Classic', fg: '#1d1d1f', bg: '#ffffff' },
  { name: 'Ocean', fg: '#0071e3', bg: '#ffffff' },
  { name: 'Forest', fg: '#0a7c4a', bg: '#ffffff' },
  { name: 'Grape', fg: '#6d28d9', bg: '#ffffff' },
  { name: 'Inverted', fg: '#ffffff', bg: '#1d1d1f' },
];

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

export const QrGenerator = () => {
  const [text, setText] = useState('https://cloudzeta.solutions');
  const [opts, setOpts] = useState<QrOptions>(DEFAULT_QR_OPTIONS);
  const [toast, setToast] = useState<string | null>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);

  const trimmed = text.trim();
  const tooLong = trimmed !== '' && !withinCapacity(trimmed, opts.ecc);
  const lowContrast = contrastRatio(opts.fg, opts.bg) < 2.5;

  const svg = useMemo(() => {
    if (!trimmed || tooLong) return '';
    try {
      return toSvg(trimmed, opts);
    } catch {
      return '';
    }
  }, [trimmed, opts, tooLong]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const flash = (msg: string) => setToast(msg);

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
    flash('SVG downloaded');
  };

  /** Rasterise the SVG to a PNG at a fixed pixel size for crisp printing. */
  const downloadPng = async (px = 1024) => {
    if (!svg) return;
    const img = new Image();
    const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('render failed'));
        img.src = svgUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = px;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, px, px);
      const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      if (blob) {
        downloadBlob(blob, 'qr-code.png');
        flash('PNG downloaded');
      }
    } catch {
      flash('Could not render PNG. Try SVG instead.');
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden grid lg:grid-cols-2">
      {/* Controls */}
      <div className="p-5 md:p-6 lg:border-r border-glass-border">
        <label htmlFor="qr-text" className="block text-sm font-semibold text-tx-primary mb-2">
          Link or text
        </label>
        <textarea
          id="qr-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="https://example.com or any text"
          className="w-full px-4 py-3 rounded-xl border border-glass-border bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all resize-none font-mono text-sm"
        />
        {tooLong && (
          <p className="mt-2 text-sm text-red-600">
            Too much data for one QR code at this error-correction level. Shorten the text or lower the level.
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
          <div className="flex gap-6">
            {(['fg', 'bg'] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm text-tx-secondary">
                <input
                  type="color"
                  value={opts[k]}
                  onChange={(e) => setOpts({ ...opts, [k]: e.target.value })}
                  aria-label={k === 'fg' ? 'Foreground colour' : 'Background colour'}
                  className="w-9 h-9 rounded-lg border border-glass-border cursor-pointer bg-white"
                />
                {k === 'fg' ? 'Foreground' : 'Background'}
              </label>
            ))}
          </div>
          {lowContrast && (
            <p className="mt-3 text-sm text-amber-600">
              Low contrast between colours. Some scanners may struggle. Keep the code darker than its background.
            </p>
          )}
        </div>

        {/* Error correction */}
        <div className="mt-6">
          <span className="block text-sm font-semibold text-tx-primary mb-1">Error correction</span>
          <p className="text-xs text-tx-secondary mb-3">
            Higher levels stay scannable when the code is dirty or partly covered, but pack less data.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {ECC_LEVELS.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                aria-pressed={opts.ecc === lvl.id}
                onClick={() => setOpts({ ...opts, ecc: lvl.id as EccLevel })}
                className={`px-2 py-2 rounded-lg border text-center transition-all ${
                  opts.ecc === lvl.id
                    ? 'bg-blue-50 border-accent ring-1 ring-accent/30'
                    : 'bg-white border-glass-border hover:border-accent/40'
                }`}
              >
                <span className="block text-sm font-semibold text-tx-primary">{lvl.label}</span>
                <span className="block text-[11px] text-tx-secondary">{lvl.recovery}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview + download */}
      <div className="p-5 md:p-6 flex flex-col items-center justify-center bg-surface/30">
        <div
          ref={svgWrapRef}
          className="w-full max-w-[16rem] aspect-square rounded-2xl border border-glass-border bg-white p-3 shadow-sm flex items-center justify-center"
        >
          {svg ? (
            <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <p className="text-sm text-tx-secondary text-center px-4">
              {tooLong ? 'Too much data. Shorten it.' : 'Enter a link or text to see your QR code.'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-5 w-full">
          <button
            type="button"
            onClick={() => downloadPng()}
            disabled={!svg}
            className="px-5 py-2.5 rounded-lg bg-tx-primary text-white text-sm font-semibold hover:bg-tx-primary/90 disabled:opacity-40"
          >
            Download PNG
          </button>
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
          Points straight at your link. No tracking redirect.
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
