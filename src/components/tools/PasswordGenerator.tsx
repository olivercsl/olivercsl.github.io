import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  generatePassword,
  generatePassphrase,
  passwordEntropy,
  passphraseEntropy,
  rateStrength,
  crackTime,
  LENGTH_MIN,
  LENGTH_MAX,
  LENGTH_DEFAULT,
  LENGTH_PRESETS,
  WORDS_MIN,
  WORDS_MAX,
  WORDS_DEFAULT,
  type PasswordOptions,
  type PassphraseOptions,
  type StrengthLevel,
} from '../../lib/password';

type Mode = 'password' | 'passphrase';

const METER_COLORS: Record<StrengthLevel, string> = {
  weak: 'bg-red-500',
  fair: 'bg-amber-500',
  strong: 'bg-blue-500',
  excellent: 'bg-emerald-500',
};

const TEXT_COLORS: Record<StrengthLevel, string> = {
  weak: 'text-red-600',
  fair: 'text-amber-600',
  strong: 'text-blue-600',
  excellent: 'text-emerald-600',
};

const SEPARATORS = [
  { value: '-', label: 'Hyphen' },
  { value: '.', label: 'Period' },
  { value: '_', label: 'Underscore' },
  { value: ' ', label: 'Space' },
];

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 py-2 ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <span className="text-tx-primary font-medium select-none">
        {label}
        {hint && <span className="text-tx-secondary font-normal ml-1.5 text-sm">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
          checked ? 'bg-accent' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}

export const PasswordGenerator = () => {
  const [mode, setMode] = useState<Mode>('password');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [spin, setSpin] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [pwOpts, setPwOpts] = useState<PasswordOptions>({
    length: LENGTH_DEFAULT,
    uppercase: true,
    lowercase: true,
    digits: true,
    symbols: true,
    excludeSimilar: false,
  });

  const [phraseOpts, setPhraseOpts] = useState<PassphraseOptions>({
    wordCount: WORDS_DEFAULT,
    separator: '-',
    capitalize: true,
    includeNumber: true,
  });

  const noClassSelected =
    !pwOpts.uppercase && !pwOpts.lowercase && !pwOpts.digits && !pwOpts.symbols;

  const regenerate = useCallback(async () => {
    try {
      if (mode === 'password') {
        setValue(generatePassword(pwOpts));
      } else {
        setValue(await generatePassphrase(phraseOpts));
      }
      setError(null);
    } catch (err) {
      setValue('');
      setError(err instanceof Error ? err.message : 'Could not generate a password.');
    }
  }, [mode, pwOpts, phraseOpts]);

  // Generate on the client only. Doing this during SSR would both mismatch on
  // hydration and put a real secret into the served HTML.
  useEffect(() => {
    void regenerate();
  }, [regenerate]);

  const bits = useMemo(
    () => (mode === 'password' ? passwordEntropy(pwOpts) : passphraseEntropy(phraseOpts)),
    [mode, pwOpts, phraseOpts],
  );
  const strength = rateStrength(bits);

  // Auto-dismiss. Keyed on the object identity, so a repeat copy restarts the timer.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Blocked by an insecure context or a denied permission. Say so rather
      // than failing silently and leaving the user unsure whether it worked.
      setToast({ msg: 'Copy failed — select the text and copy manually.', ok: false });
      return;
    }
    setCopied(true);
    setToast({ msg: 'Password copied to clipboard', ok: true });
  };

  const handleRegenerate = () => {
    setSpin(true);
    setTimeout(() => setSpin(false), 500);
    void regenerate();
  };

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      {/* Mode switch. Kept as a compact segmented control rather than full-width
          tabs, so it doesn't read as a header for the two columns below. */}
      <div className="px-5 md:px-6 pt-5 md:pt-6">
        <div
          role="tablist"
          aria-label="Generator mode"
          className="inline-flex gap-1 p-1 bg-surface rounded-xl border border-glass-border"
        >
          {(['password', 'passphrase'] as Mode[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                mode === m
                  ? 'bg-white text-accent shadow-sm'
                  : 'text-tx-secondary hover:text-tx-primary'
              }`}
            >
              {m === 'password' ? 'Random password' : 'Passphrase'}
            </button>
          ))}
        </div>
      </div>

      {/* Two columns from lg up, so the whole tool clears the fold on a laptop. */}
      <div className="p-5 md:p-6 pt-4 md:pt-5 grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
        {/* Left: output, strength, assurance */}
        <div className="flex flex-col">
        {/* Buttons sit in normal flow rather than absolutely positioned, so a
            wrapped passphrase can never run underneath them on narrow screens. */}
        <div className="bg-surface rounded-2xl border border-glass-border p-4 md:p-5 min-h-[92px] flex flex-col sm:flex-row sm:items-center gap-3">
          {error ? (
            <p className="text-red-600 font-medium flex-1">{error}</p>
          ) : (
            <output
              aria-live="polite"
              aria-label="Generated password"
              className="font-mono text-lg sm:text-xl md:text-2xl text-tx-primary leading-relaxed select-all flex-1 [overflow-wrap:anywhere]"
            >
              {value || ' '}
            </output>
          )}

          <div className="flex items-center gap-1.5 self-end sm:self-auto sm:shrink-0">
            <button
              type="button"
              onClick={handleRegenerate}
              aria-label="Generate a new password"
              title="Generate new"
              className="w-10 h-10 rounded-xl bg-white border border-glass-border shadow-sm hover:shadow-md hover:text-accent text-tx-secondary transition-all flex items-center justify-center"
            >
              <svg
                className={`w-5 h-5 ${spin ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!value}
              aria-label="Copy password to clipboard"
              title="Copy"
              className={`w-10 h-10 rounded-xl border shadow-sm transition-all flex items-center justify-center disabled:opacity-40 ${
                copied
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-white border-glass-border text-tx-secondary hover:shadow-md hover:text-accent'
              }`}
            >
              {copied ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Toast. role=status doubles as the screen-reader announcement, so no
            separate sr-only element is needed. */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`toast-pop fixed bottom-6 left-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full shadow-xl text-sm font-medium text-white ${
              toast.ok ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          >
            {toast.ok ? (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            )}
            {toast.msg}
          </div>
        )}

        {/* Strength meter */}
        <div className="mt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-2 text-xs sm:text-sm">
            <span className="text-tx-secondary">
              Strength:{' '}
              <span className={`font-semibold ${TEXT_COLORS[strength.level]}`}>{strength.label}</span>
            </span>
            <span className="text-tx-secondary tabular-nums">
              {Math.round(bits)} bits &middot; {crackTime(bits)} to crack
            </span>
          </div>
          <div
            className="h-2 bg-gray-200 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(strength.percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Password strength: ${strength.label}`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${METER_COLORS[strength.level]}`}
              style={{ width: `${strength.percent}%` }}
            />
          </div>
        </div>

          {/* Privacy assurance */}
          <div className="mt-5 flex items-start gap-3 p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
            <svg
              className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <p className="text-sm text-emerald-900 leading-relaxed">
              <strong className="font-semibold">Generated entirely in your browser.</strong> Never
              transmitted, stored, or logged.
            </p>
          </div>
        </div>

        {/* Right: controls */}
        <div className="mt-7 lg:mt-0">
          {mode === 'password' ? (
            <>
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="pw-length" className="text-tx-primary font-medium">
                    Length
                  </label>
                  <span className="font-mono text-lg font-semibold text-accent tabular-nums">
                    {pwOpts.length}
                  </span>
                </div>
                <input
                  id="pw-length"
                  type="range"
                  min={LENGTH_MIN}
                  max={LENGTH_MAX}
                  value={pwOpts.length}
                  onChange={(e) => setPwOpts({ ...pwOpts, length: Number(e.target.value) })}
                  className="w-full accent-accent cursor-pointer"
                />
                <div className="flex justify-between text-xs text-tx-secondary mt-1">
                  <span>{LENGTH_MIN}</span>
                  <span>{LENGTH_MAX}</span>
                </div>

                {/* Quick presets. Deliberately no sub-16 shortcut — one-click
                    access to a weak length isn't a good default to offer. */}
                <div className="flex gap-2 mt-3">
                  {LENGTH_PRESETS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={pwOpts.length === n}
                      onClick={() => setPwOpts({ ...pwOpts, length: n })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all tabular-nums ${
                        pwOpts.length === n
                          ? 'bg-accent text-white border-accent'
                          : 'bg-white text-tx-secondary border-glass-border hover:border-accent/40 hover:text-tx-primary'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-gray-100 border-t border-gray-100">
                <Toggle
                  label="Uppercase"
                  hint="A-Z"
                  checked={pwOpts.uppercase}
                  onChange={(v) => setPwOpts({ ...pwOpts, uppercase: v })}
                />
                <Toggle
                  label="Lowercase"
                  hint="a-z"
                  checked={pwOpts.lowercase}
                  onChange={(v) => setPwOpts({ ...pwOpts, lowercase: v })}
                />
                <Toggle
                  label="Digits"
                  hint="0-9"
                  checked={pwOpts.digits}
                  onChange={(v) => setPwOpts({ ...pwOpts, digits: v })}
                />
                <Toggle
                  label="Symbols"
                  hint="!@#$%"
                  checked={pwOpts.symbols}
                  onChange={(v) => setPwOpts({ ...pwOpts, symbols: v })}
                />
                <Toggle
                  label="Exclude similar characters"
                  hint="O0 l1| S5"
                  checked={pwOpts.excludeSimilar}
                  onChange={(v) => setPwOpts({ ...pwOpts, excludeSimilar: v })}
                />
              </div>

              {noClassSelected && (
                <p className="mt-4 text-sm text-red-600">
                  Select at least one character type to generate a password.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="pp-words" className="text-tx-primary font-medium">
                    Words
                  </label>
                  <span className="font-mono text-lg font-semibold text-accent tabular-nums">
                    {phraseOpts.wordCount}
                  </span>
                </div>
                <input
                  id="pp-words"
                  type="range"
                  min={WORDS_MIN}
                  max={WORDS_MAX}
                  value={phraseOpts.wordCount}
                  onChange={(e) =>
                    setPhraseOpts({ ...phraseOpts, wordCount: Number(e.target.value) })
                  }
                  className="w-full accent-accent cursor-pointer"
                />
                <div className="flex justify-between text-xs text-tx-secondary mt-1">
                  <span>{WORDS_MIN}</span>
                  <span>{WORDS_MAX}</span>
                </div>
              </div>

              <div className="mb-2">
                <span className="text-tx-primary font-medium block mb-2">Separator</span>
                <div className="flex gap-2 flex-wrap">
                  {SEPARATORS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setPhraseOpts({ ...phraseOpts, separator: s.value })}
                      className={`px-3 sm:px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        phraseOpts.separator === s.value
                          ? 'bg-accent text-white border-accent'
                          : 'bg-white text-tx-secondary border-glass-border hover:border-accent/40'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-gray-100 border-t border-gray-100 mt-4">
                <Toggle
                  label="Capitalize words"
                  checked={phraseOpts.capitalize}
                  onChange={(v) => setPhraseOpts({ ...phraseOpts, capitalize: v })}
                />
                <Toggle
                  label="Include a number"
                  checked={phraseOpts.includeNumber}
                  onChange={(v) => setPhraseOpts({ ...phraseOpts, includeNumber: v })}
                />
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
