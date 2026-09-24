import { useEffect, useRef, useState } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/**
 * variant="icon"      → compact icon button with a dropdown (navbar / app header)
 * variant="segmented" → 3-way pill toggle (footer / mobile menu)
 * variant="cards"     → large option cards (Profile → Appearance)
 */
export default function ThemeSwitcher({ variant = 'icon', className }) {
  const { theme, resolved, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (variant === 'segmented')
    return (
      <div role="radiogroup" aria-label="Theme" className={cn('inline-flex items-center gap-0.5 rounded-full border border-ink-600 bg-ink-800/60 p-0.5', className)}>
        {THEME_OPTIONS.map(({ value, label, icon: I }) => (
          <button
            key={value}
            role="radio"
            aria-checked={theme === value}
            aria-label={`${label} theme`}
            title={label}
            onClick={() => setTheme(value)}
            className={cn('rounded-full p-1.5 transition', theme === value ? 'bg-ink-600 text-white shadow-sm' : 'text-slate-500 hover:text-white')}
          >
            <I className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
    );

  if (variant === 'cards')
    return (
      <div role="radiogroup" aria-label="Theme" className={cn('grid gap-3 sm:grid-cols-3', className)}>
        {THEME_OPTIONS.map(({ value, label, icon: I }) => (
          <button
            key={value}
            role="radio"
            aria-checked={theme === value}
            onClick={() => setTheme(value)}
            className={cn('group overflow-hidden rounded-xl border text-left transition', theme === value ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-ink-600 hover:border-brand-500/50')}
          >
            {/* mini preview */}
            <div className="flex h-20 overflow-hidden">
              {(value === 'system' ? ['light', 'dark'] : [value]).map((m) => (
                <div key={m} className={cn('flex-1 p-2', m === 'light' ? 'bg-[#f6f7fb]' : 'bg-[#0a0a12]')}>
                  <div className={cn('mb-1.5 h-2 w-10 rounded', m === 'light' ? 'bg-[#0f172a]/70' : 'bg-white/80')} style={m === 'dark' ? { background: 'rgba(255,255,255,.8)' } : undefined} />
                  <div className={cn('h-8 rounded-md border', m === 'light' ? 'border-[#dfe2eb] bg-snow' : 'border-[#26263b] bg-[#12121f]')} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-ink-600 px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm font-medium text-white"><I className="h-4 w-4" /> {label}</span>
              {theme === value && <Check className="h-4 w-4 text-brand-400" />}
            </div>
          </button>
        ))}
      </div>
    );

  const Current = resolved === 'light' ? Sun : Moon;
  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-600 text-slate-300 transition hover:border-brand-500/50 hover:text-white"
        aria-label={`Theme: ${theme}. Change theme`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Theme"
      >
        <Current className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-50 w-40 animate-fadeUp overflow-hidden rounded-xl border border-ink-600 bg-ink-850 p-1 shadow-2xl">
          {THEME_OPTIONS.map(({ value, label, icon: I }) => (
            <button
              key={value}
              role="menuitemradio"
              aria-checked={theme === value}
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
              className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition', theme === value ? 'bg-brand-500/15 text-white' : 'text-slate-300 hover:bg-ink-700')}
            >
              <I className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
              {theme === value && <Check className="h-3.5 w-3.5 text-brand-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
