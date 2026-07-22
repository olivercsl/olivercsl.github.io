import React, { useState, useEffect, useRef } from 'react';
import {
  wallTimeIn,
  wallTimeToInstant,
  rateHour,
  countryName,
  flagEmoji,
  type WallTime,
  type Suitability,
  type SearchResult,
} from '../../lib/timezones';

/**
 * Hour grid, not a time spinner.
 *
 * A native <input type="time"> makes you set hour, minute and meridiem in
 * separate spinners, then work out for yourself whether the result suits the
 * other people on the call. A flat 24-item dropdown has the same problem.
 *
 * Meetings land on the hour or half hour, so the useful control is a small
 * grid of hours — coloured by how the hour lands across *every* location, with
 * the actual local times shown for whichever hour you are pointing at. You
 * choose from options you can already evaluate, instead of picking blind and
 * checking afterwards.
 */

const CELL: Record<Suitability, string> = {
  good: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200',
  ok: 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200',
  poor: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200',
};

const MINUTES = [0, 15, 30, 45];

const hourLabel = (h: number) => {
  const suffix = h < 12 ? 'am' : 'pm';
  const base = h % 12 === 0 ? 12 : h % 12;
  return `${base}${suffix}`;
};

const timeLabel = (w: WallTime) =>
  `${w.hour % 12 === 0 ? 12 : w.hour % 12}:${String(w.minute).padStart(2, '0')} ${w.hour < 12 ? 'am' : 'pm'}`;

interface Props {
  /** Zone the grid's hours belong to. */
  zone: string;
  /** Currently selected wall time in that zone. */
  wall: WallTime;
  /** Every location, so an hour can be rated for the whole group. */
  locs: SearchResult[];
  onPick: (instant: Date) => void;
  onClose: () => void;
}

export const TimePicker = ({ zone, wall, locs, onPick, onClose }: Props) => {
  const [minute, setMinute] = useState(MINUTES.includes(wall.minute) ? wall.minute : 0);
  // Defaults to the selected hour, and returns to it on mouse-out. Touch
  // devices never fire hover, so this panel would otherwise be dead space on a
  // phone — instead it always explains the current choice.
  const [preview, setPreview] = useState<number>(wall.hour);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const instantFor = (hour: number) => wallTimeToInstant({ ...wall, hour, minute }, zone);

  /** Worst rating across all locations — a green cell suits everyone at once. */
  const rateAcrossGroup = (hour: number): Suitability => {
    const at = instantFor(hour);
    const rank: Record<Suitability, number> = { good: 0, ok: 1, poor: 2 };
    const order: Suitability[] = ['good', 'ok', 'poor'];
    let worst = 0;
    for (const l of locs) worst = Math.max(worst, rank[rateHour(wallTimeIn(at, l.zone).hour)]);
    return order[worst]!;
  };

  const previewInstant = instantFor(preview);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Choose a time"
      /* Anchored popover on desktop. On a phone there is not enough room beside
         the button — it ran off the left edge — so it becomes a centred sheet. */
      className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white border border-glass-border rounded-2xl shadow-2xl p-4
                 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:translate-y-0 sm:mt-2 sm:w-[22rem] sm:z-40"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-tx-primary">Choose an hour</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close time picker"
          className="p-1 text-tx-secondary hover:text-tx-primary"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-6 gap-1.5" onMouseLeave={() => setPreview(wall.hour)}>
        {Array.from({ length: 24 }, (_, h) => {
          const selected = h === wall.hour;
          return (
            <button
              key={h}
              type="button"
              onMouseEnter={() => setPreview(h)}
              onFocus={() => setPreview(h)}
              onClick={() => {
                onPick(instantFor(h));
                onClose();
              }}
              aria-label={`${hourLabel(h)}: ${rateAcrossGroup(h)} for everyone`}
              className={`py-2 rounded-lg border text-xs font-semibold tabular-nums transition-colors ${
                selected ? 'ring-2 ring-accent ring-offset-1 ' : ''
              }${CELL[rateAcrossGroup(h)]}`}
            >
              {hourLabel(h)}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-4">
        <span className="text-xs font-medium text-tx-secondary shrink-0">Minutes</span>
        {MINUTES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMinute(m)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              m === minute
                ? 'bg-accent text-white border-accent'
                : 'bg-white text-tx-secondary border-glass-border hover:border-accent/40'
            }`}
          >
            :{String(m).padStart(2, '0')}
          </button>
        ))}
      </div>

      {/* Consequence of the hour under the pointer, before committing to it. */}
      <div className="mt-4 pt-3 border-t border-gray-100 min-h-[76px]">
        {locs.length ? (
          <ul className="space-y-1">
            {locs.slice(0, 5).map((l) => {
              const w = wallTimeIn(previewInstant, l.zone);
              const r = rateHour(w.hour);
              return (
                <li key={`${l.zone}-${l.city}`} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-tx-secondary">
                    {flagEmoji(l.cc)} {l.city}
                    {l.cc && <span className="hidden sm:inline">, {countryName(l.cc)}</span>}
                  </span>
                  <span
                    className={`font-semibold tabular-nums shrink-0 ${
                      r === 'good' ? 'text-emerald-600' : r === 'ok' ? 'text-amber-600' : 'text-rose-500'
                    }`}
                  >
                    {timeLabel(w)}
                  </span>
                </li>
              );
            })}
            {locs.length > 5 && (
              <li className="text-xs text-tx-secondary">+{locs.length - 5} more</li>
            )}
          </ul>
        ) : (
          <p className="text-xs text-tx-secondary">
            Add locations to see how each hour lands for them.
          </p>
        )}
      </div>
    </div>
  );
};
