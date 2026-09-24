import { useEffect, useRef, useState } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * true once the element has scrolled into view (animations start then).
 * Returns a callback ref, so it also works when the element appears later (e.g. after data loads).
 */
export function useInView(options = { threshold: 0.25 }) {
  const [el, setEl] = useState(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!el || inView) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setInView(true);
        io.disconnect();
      }
    }, options);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el, inView]);
  return [setEl, inView];
}

const easeOut = (t) => 1 - Math.pow(1 - t, 4);

/**
 * Animated number: counts up from 0 when it first appears, and from the old value to the
 * new value whenever it changes (e.g. the admin updates the review count → the number rolls).
 */
export function useCountUp(target, { start = true, duration = 1600 } = {}) {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const to = Number(target) || 0;
    if (!start) return undefined;
    if (reduced()) {
      setValue(to);
      from.current = to;
      return undefined;
    }
    const begin = from.current;
    const t0 = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const v = begin + (to - begin) * easeOut(p);
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = to;
    };
  }, [target, start, duration]);
  return value;
}

/** Parses "1,200+" → { n: 1200, suffix: "+" } so text stats can animate too. */
export function parseStat(v) {
  const m = String(v ?? '').match(/^([^\d]*)([\d,.]+)(.*)$/);
  if (!m) return null;
  const raw = m[2].replace(/,/g, '');
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return null;
  return { prefix: m[1], n, suffix: m[3], decimals: raw.includes('.') ? raw.split('.')[1].length : 0, grouped: m[2].includes(',') };
}

/**
 * 3-D tilt that follows the mouse. Spread the returned handlers on an element with the `tilt` class
 * (and optionally a child `.tilt-light` for the moving highlight).
 */
export function useTilt(max = 7) {
  const set = (el, vars) => Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
  return {
    onMouseMove: (e) => {
      if (reduced()) return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      set(el, { '--ry': `${(x - 0.5) * max * 2}deg`, '--rx': `${(0.5 - y) * max * 2}deg`, '--mx': `${x * 100}%`, '--my': `${y * 100}%`, '--ty': '-4px' });
    },
    onMouseLeave: (e) => set(e.currentTarget, { '--ry': '0deg', '--rx': '0deg', '--ty': '0px' }),
  };
}
