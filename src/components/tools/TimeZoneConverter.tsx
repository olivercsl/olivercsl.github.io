import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  searchCities,
  wallTimeIn,
  offsetMinutes,
  wallTimeToInstant,
  zoneAbbreviation,
  formatOffset,
  describeDifference,
  rateHour,
  localZone,
  cityForZone,
  countryName,
  flagEmoji,
  SUITABILITY_EMOJI,
  type Suitability,
  type SearchResult,
} from '../../lib/timezones';
import { TimePicker } from './TimePicker';

interface Loc extends SearchResult {
  id: string;
}

const STORAGE_KEY = 'cloudzeta.tzc.zones';
const WINDOW_HOURS = 48;
const SLOT_MINUTES = 30;
const SLOTS = (WINDOW_HOURS * 60) / SLOT_MINUTES;

const BAND: Record<Suitability, string> = {
  good: 'bg-emerald-400',
  ok: 'bg-amber-300',
  poor: 'bg-rose-300',
};

const TEXT: Record<Suitability, string> = {
  good: 'text-emerald-600',
  ok: 'text-amber-600',
  poor: 'text-rose-500',
};

let seq = 0;
const makeLoc = (r: SearchResult): Loc => ({ ...r, id: `${r.zone}-${seq++}` });

const pad = (n: number) => String(n).padStart(2, '0');
const toDateInput = (w: { year: number; month: number; day: number }) =>
  `${w.year}-${pad(w.month)}-${pad(w.day)}`;
const displayTime = (w: { hour: number; minute: number }) =>
  `${w.hour % 12 === 0 ? 12 : w.hour % 12}:${pad(w.minute)} ${w.hour < 12 ? 'am' : 'pm'}`;

const round15 = (d: Date) => new Date(Math.round(d.getTime() / 900000) * 900000);

/** Just the visitor's own zone. Anything else would be us guessing. */
function defaultLocations(): Loc[] {
  return [makeLoc(cityForZone(localZone()))];
}

/**
 * Rows are serialised as "zone~city~cc", not bare zone ids.
 *
 * Several cities share a zone — Boston and New York are both America/New_York.
 * Storing only the zone meant a reload (or a shared link) turned the visitor's
 * "Boston" row into "New York", which is the wrong city for the person reading it.
 */
const encodeLoc = (l: SearchResult) => `${l.zone}~${l.city}~${l.cc}`;

function decodeLoc(entry: string): SearchResult | null {
  const [zone, city, cc] = entry.split('~');
  if (!zone) return null;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone }); // reject junk from a hand-edited URL
  } catch {
    return null;
  }
  return city ? { zone, city, cc: cc ?? '' } : cityForZone(zone);
}

function readInitialState(): { locs: Loc[]; instant: Date | null } {
  if (typeof window === 'undefined') return { locs: [], instant: null };

  const params = new URLSearchParams(window.location.search);
  const zParam = params.get('z');
  const tParam = params.get('t');

  let locs: Loc[] | null = null;
  if (zParam) {
    const parsed = zParam.split(',').map(decodeLoc).filter(Boolean) as SearchResult[];
    if (parsed.length) locs = parsed.map(makeLoc);
  }
  if (!locs) {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(saved) && saved.length) {
        // Older builds stored bare zone strings; decodeLoc handles both shapes.
        const parsed = saved.map((e: string) => decodeLoc(String(e))).filter(Boolean) as SearchResult[];
        if (parsed.length) locs = parsed.map(makeLoc);
      }
    } catch {
      /* ignore malformed storage */
    }
  }

  const parsed = tParam ? new Date(tParam) : null;
  const instant = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;

  return { locs: locs ?? defaultLocations(), instant };
}

export const TimeZoneConverter = () => {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [instant, setInstant] = useState<Date | null>(null);
  const [windowStart, setWindowStart] = useState<Date | null>(null);
  const [live, setLive] = useState(true);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  /** id of the row whose time picker is open, if any */
  const [picking, setPicking] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Hydrate on the client only: local zone and "now" both differ on the server.
  useEffect(() => {
    const { locs: l, instant: i } = readInitialState();
    setLocs(l);
    setReady(true);
    const start = i ?? new Date();
    setInstant(start);
    setWindowStart(new Date(round15(start).getTime() - 12 * 3600000));
    setLive(!i);
  }, []);

  // Tick while following the current time.
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setInstant(new Date()), 1000);
    return () => clearInterval(id);
  }, [live]);

  // Persist an empty list too, so removing every row actually sticks instead of
  // the old selection reappearing on reload.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(locs.map(encodeLoc)));
    } catch {
      /* storage may be unavailable; not worth surfacing */
    }
  }, [locs, ready]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // Close the suggestion list on an outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setQuery('');
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const results = useMemo(() => (query.trim() ? searchCities(query, 8) : []), [query]);

  /** Any explicit time change stops following the clock. */
  const applyInstant = useCallback(
    (next: Date) => {
      setLive(false);
      setInstant(next);
      setWindowStart((ws) => {
        if (!ws) return new Date(round15(next).getTime() - 12 * 3600000);
        const end = ws.getTime() + WINDOW_HOURS * 3600000;
        const outside = next.getTime() < ws.getTime() || next.getTime() > end;
        return outside ? new Date(round15(next).getTime() - 12 * 3600000) : ws;
      });
    },
    [],
  );

  const goLive = () => {
    const now = new Date();
    setInstant(now);
    setWindowStart(new Date(round15(now).getTime() - 12 * 3600000));
    setLive(true);
  };

  const shiftDays = (days: number) => {
    if (!instant) return;
    applyInstant(new Date(instant.getTime() + days * 86400000));
    setWindowStart((ws) => (ws ? new Date(ws.getTime() + days * 86400000) : ws));
  };

  const addLocation = (r: SearchResult) => {
    setLocs((prev) => {
      // Dedupe on city as well as zone. Boston and New York share a zone, but
      // if your counterpart is in Boston you want to see "Boston" on the row —
      // deduping on zone alone made the click silently do nothing.
      if (prev.some((p) => p.zone === r.zone && p.city === r.city)) {
        setToast(`${r.city} is already listed`);
        return prev;
      }
      return [...prev, makeLoc(r)];
    });
    setQuery('');
    setHighlight(0);
  };

  const move = (index: number, delta: number) => {
    setLocs((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  const reference = locs[0];
  const refOffset = reference && instant ? offsetMinutes(instant, reference.zone) : 0;

  /** Worst suitability across every location, per slot — when can everyone meet. */
  const bands = useMemo(() => {
    if (!windowStart || !locs.length) return [];
    const rank: Record<Suitability, number> = { good: 0, ok: 1, poor: 2 };
    const order: Suitability[] = ['good', 'ok', 'poor'];
    return Array.from({ length: SLOTS }, (_, i) => {
      const at = new Date(windowStart.getTime() + i * SLOT_MINUTES * 60000);
      let worst = 0;
      for (const l of locs) worst = Math.max(worst, rank[rateHour(wallTimeIn(at, l.zone).hour)]);
      return order[worst]!;
    });
  }, [windowStart, locs]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !instant || !locs.length) return '';
    const u = new URL(window.location.href);
    u.search = '';
    u.searchParams.set('z', locs.map(encodeLoc).join(','));
    u.searchParams.set('t', new Date(Math.round(instant.getTime() / 60000) * 60000).toISOString());
    return u.toString();
  }, [instant, locs]);

  const copy = async (text: string, html: string | null, message: string) => {
    try {
      if (html && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([text], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setToast(message);
    } catch {
      setToast('Copy failed. Select the text and copy manually.');
    }
  };

  const copyTimes = () => {
    if (!instant) return;
    const rows = locs.map((l) => {
      const w = wallTimeIn(instant, l.zone);
      const date = new Date(Date.UTC(w.year, w.month - 1, w.day)).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      });
      const time = new Date(Date.UTC(2000, 0, 1, w.hour, w.minute)).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'UTC',
      });
      return { name: `${l.city}${l.cc ? `, ${countryName(l.cc)}` : ''}`, date, time, abbr: zoneAbbreviation(instant, l.zone) };
    });

    const text = rows.map((r) => `${r.name}: ${r.time} ${r.abbr}, ${r.date}`).join('\n');
    const html =
      `<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">` +
      rows
        .map(
          (r) =>
            `<tr><td style="padding:4px 14px 4px 0">${r.name}</td>` +
            `<td style="padding:4px 14px 4px 0"><strong>${r.time}</strong> ${r.abbr}</td>` +
            `<td style="padding:4px 0;color:#666">${r.date}</td></tr>`,
        )
        .join('') +
      `</table>`;

    void copy(text, html, 'Times copied. Paste into an email');
  };

  // Wait only for hydration — never for locations. An earlier version also
  // bailed out when the list was empty, which meant removing every row hid the
  // search box and left the tool permanently stuck with no way to add one back.
  if (!instant || !windowStart) {
    return <div className="bg-white rounded-3xl border border-glass-border shadow-xl min-h-[420px]" />;
  }

  const sliderValue = Math.min(
    WINDOW_HOURS * 60,
    Math.max(0, Math.round((instant.getTime() - windowStart.getTime()) / 60000)),
  );

  const labelZone = reference?.zone ?? localZone();
  const edgeLabel = (d: Date) =>
    `${wallTimeIn(d, labelZone).day} ${new Date(d).toLocaleDateString('en-GB', {
      month: 'short',
      timeZone: labelZone,
    })}, ${new Date(d).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: labelZone,
    })}`;

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      {/* Search */}
      <div className="p-5 md:p-6 border-b border-glass-border" ref={searchRef}>
        <label htmlFor="tz-search" className="block text-sm font-semibold text-tx-primary mb-2">
          Add location
        </label>
        <div className="relative">
          <input
            id="tz-search"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={(e) => {
              if (!results.length) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlight((h) => (h + 1) % results.length);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlight((h) => (h - 1 + results.length) % results.length);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                addLocation(results[highlight]!);
              } else if (e.key === 'Escape') {
                setQuery('');
              }
            }}
            placeholder="Search for a city or time zone…"
            autoComplete="off"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="tz-results"
            className="w-full px-4 py-3 pr-10 rounded-xl border border-glass-border bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
          />
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tx-secondary pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>

          {results.length > 0 && (
            <ul
              id="tz-results"
              role="listbox"
              className="absolute z-30 left-0 right-0 mt-2 bg-white border border-glass-border rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto"
            >
              {results.map((r, i) => (
                <li key={`${r.zone}-${r.city}`} role="option" aria-selected={i === highlight}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => addLocation(r)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                      i === highlight ? 'bg-blue-50' : 'hover:bg-surface'
                    }`}
                  >
                    <span className="text-lg leading-none">{flagEmoji(r.cc)}</span>
                    <span className="flex-1 min-w-0">
                      <span className="font-medium text-tx-primary">{r.city}</span>
                      {r.cc && <span className="text-tx-secondary">, {countryName(r.cc)}</span>}
                    </span>
                    <span className="text-xs text-tx-secondary tabular-nums shrink-0">
                      {formatOffset(offsetMinutes(instant, r.zone))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Locations */}
      {locs.length === 0 && (
        <div className="px-6 py-14 text-center">
          <p className="text-tx-primary font-medium mb-1">No locations yet</p>
          <p className="text-sm text-tx-secondary mb-5">
            Search above to add a city, or start from where you are.
          </p>
          <button
            type="button"
            onClick={() => setLocs(defaultLocations())}
            className="px-4 py-2 rounded-lg border border-glass-border text-sm font-medium text-tx-secondary hover:text-tx-primary hover:border-accent/40"
          >
            Add my time zone
          </button>
        </div>
      )}

      <ul className="divide-y divide-gray-100">
        {locs.map((loc, i) => {
          const w = wallTimeIn(instant, loc.zone);
          const off = offsetMinutes(instant, loc.zone);
          const rating = rateHour(w.hour);
          const isRef = i === 0;

          return (
            <li
              key={loc.id}
              className={`px-5 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 ${
                isRef ? 'bg-blue-50/40' : ''
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-2xl leading-none mt-0.5">{flagEmoji(loc.cc)}</span>
                <div className="min-w-0">
                  <div className="font-semibold text-tx-primary truncate">
                    {loc.city}
                    {loc.cc && <span className="font-normal text-tx-secondary">, {countryName(loc.cc)}</span>}
                    {isRef && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                        Reference
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-tx-secondary">
                    {zoneAbbreviation(instant, loc.zone)} ({formatOffset(off)})
                    {!isRef && <> · {describeDifference(off - refOffset)}</>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
                <input
                  type="date"
                  aria-label={`Date in ${loc.city}`}
                  value={toDateInput(w)}
                  onChange={(e) => {
                    const [y, m, d] = e.target.value.split('-').map(Number);
                    if (!y || !m || !d) return;
                    applyInstant(wallTimeToInstant({ ...w, year: y, month: m, day: d }, loc.zone));
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-glass-border bg-white text-sm text-tx-secondary focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                {/* A button opening an hour grid, not a native time spinner —
                    see TimePicker for why. */}
                <div className="relative">
                  <button
                    type="button"
                    aria-label={`Change time in ${loc.city}`}
                    aria-haspopup="dialog"
                    aria-expanded={picking === loc.id}
                    onClick={() => setPicking((p) => (p === loc.id ? null : loc.id))}
                    className={`px-3 py-1.5 rounded-lg border bg-white text-base font-semibold text-tx-primary tabular-nums transition-all hover:border-accent/50 ${
                      picking === loc.id ? 'border-accent ring-2 ring-accent/30' : 'border-glass-border'
                    }`}
                  >
                    {displayTime(w)}
                  </button>

                  {picking === loc.id && (
                    <TimePicker
                      zone={loc.zone}
                      wall={w}
                      locs={locs}
                      onPick={applyInstant}
                      onClose={() => setPicking(null)}
                    />
                  )}
                </div>
                <span className={`text-lg ${TEXT[rating]}`} title={`Local hour rated ${rating}`}>
                  {SUITABILITY_EMOJI[rating]}
                </span>

                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${loc.city} up`}
                    className="p-1.5 text-tx-secondary hover:text-accent disabled:opacity-25 disabled:hover:text-tx-secondary"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === locs.length - 1}
                    aria-label={`Move ${loc.city} down`}
                    className="p-1.5 text-tx-secondary hover:text-accent disabled:opacity-25 disabled:hover:text-tx-secondary"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocs((prev) => prev.filter((p) => p.id !== loc.id))}
                    aria-label={`Remove ${loc.city}`}
                    className="p-1.5 text-tx-secondary hover:text-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Timeline — nothing to rate until at least one location exists. */}
      <div className={`px-5 md:px-6 pt-5 pb-4 border-t border-glass-border bg-surface/40 ${locs.length ? '' : 'hidden'}`}>
        <div className="flex items-center justify-between text-xs text-tx-secondary mb-2">
          <span>{edgeLabel(windowStart)}</span>
          <span className="font-medium text-tx-primary">
            Drag to find a time that suits everyone
          </span>
          <span>{edgeLabel(new Date(windowStart.getTime() + WINDOW_HOURS * 3600000))}</span>
        </div>

        <div className="relative">
          <div className="flex h-3 rounded-full overflow-hidden" aria-hidden="true">
            {bands.map((b, i) => (
              <div key={i} className={`flex-1 ${BAND[b]}`} />
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={WINDOW_HOURS * 60}
            step={15}
            value={sliderValue}
            aria-label="Selected time"
            onChange={(e) => applyInstant(new Date(windowStart.getTime() + Number(e.target.value) * 60000))}
            className="absolute inset-x-0 -top-1 w-full h-5 cursor-pointer appearance-none bg-transparent
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                       [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent
                       [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab
                       [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
                       [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-tx-secondary">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400" /> Working hours</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-300" /> Early or late</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-300" /> Asleep</span>
        </div>
      </div>

      {/* Controls */}
      <div className="px-5 md:px-6 py-4 border-t border-glass-border flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => shiftDays(-1)} aria-label="Previous day"
          className="px-3 py-2 rounded-lg border border-glass-border text-sm font-medium text-tx-secondary hover:text-tx-primary hover:border-accent/40">
          ‹ Day
        </button>
        <button type="button" onClick={goLive}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
            live ? 'bg-accent text-white border-accent' : 'border-glass-border text-tx-secondary hover:text-tx-primary hover:border-accent/40'
          }`}>
          {live ? 'Following now' : 'Current time'}
        </button>
        <button type="button" onClick={() => shiftDays(1)} aria-label="Next day"
          className="px-3 py-2 rounded-lg border border-glass-border text-sm font-medium text-tx-secondary hover:text-tx-primary hover:border-accent/40">
          Day ›
        </button>

        <div className="flex-1" />

        <button type="button" onClick={copyTimes}
          className="px-4 py-2 rounded-lg bg-tx-primary text-white text-sm font-semibold hover:bg-tx-primary/90 transition-colors">
          Copy times
        </button>
        <button type="button" onClick={() => void copy(shareUrl, null, 'Link copied')}
          className="px-4 py-2 rounded-lg border border-glass-border text-sm font-medium text-tx-secondary hover:text-tx-primary hover:border-accent/40">
          Copy link
        </button>
        <button type="button" onClick={() => setLocs(defaultLocations())}
          className="px-3 py-2 rounded-lg text-sm font-medium text-tx-secondary hover:text-red-600">
          Reset
        </button>
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
