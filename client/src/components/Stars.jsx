import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../lib/utils';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/** Clickable 1–5 star input with hover preview. */
export function StarInput({ value = 0, onChange, size = 'h-7 w-7', label }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1" role="radiogroup" aria-label={label} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="rounded transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Star className={cn(size, 'transition', n <= shown ? 'fill-amber-400 text-amber-400' : 'text-slate-600')} />
          </button>
        ))}
      </div>
      <span className="w-20 text-sm text-slate-400">{LABELS[shown]}</span>
    </div>
  );
}

/** Read-only stars (supports halves visually by rounding). */
export function StarRow({ value = 0, className = 'h-4 w-4' }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn(className, n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-600')} />)}
    </span>
  );
}

export const RATING_KEYS = [
  ['communication', 'Communication level'],
  ['satisfaction', 'Satisfaction'],
  ['value', 'Value for money'],
];

/** Zeviro's review of a client (one per completed order). */
export const CLIENT_RATING_KEYS = [
  ['communication', 'Communication'],
  ['requirements', 'Clear requirements'],
  ['again', 'Would work with again'],
];
