import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errMsg } from '../api/http';

export const cn = (...c) => c.filter(Boolean).join(' ');

export const fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString(undefined, opts) : '—';
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
export const fmtMoney = (n, cur = 'USD') => {
  const v = Number(n || 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur || 'USD', minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }).format(v);
};
export const fmtSize = (b = 0) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
export const timeAgo = (d) => {
  if (!d) return '';
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(d);
};
export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const toInputDateTime = (d) => {
  if (!d) return '';
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};

/** Data fetching hook: const { data, loading, error, reload, setData } = useFetch('/url', params) */
export function useFetch(url, params, { skip = false } = {}) {
  const [state, setState] = useState({ data: null, loading: !skip, error: null });
  const key = JSON.stringify(params || {});
  const alive = useRef(true);
  const load = useCallback(async (silent = false) => {
    if (!url || skip) return;
    if (silent !== true) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api.get(url, params);
      if (alive.current) setState({ data, loading: false, error: null });
    } catch (e) {
      if (alive.current) setState({ data: null, loading: false, error: errMsg(e) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key, skip]);
  useEffect(() => {
    alive.current = true;
    load(false);
    return () => {
      alive.current = false;
    };
  }, [load]);
  return { ...state, reload: () => load(false), refresh: () => load(true), setData: (d) => setState((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })) };
}

export function usePolling(fn, ms, deps = []) {
  useEffect(() => {
    const id = setInterval(fn, ms);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Anonymous visitor id for chat + analytics (no personal data)
export function visitorId() {
  try {
    let v = localStorage.getItem('zv_vid');
    if (!v) {
      v = `v-${crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)}`;
      localStorage.setItem('zv_vid', v);
    }
    return v;
  } catch {
    return `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

export function track(type, meta) {
  try {
    if (localStorage.getItem('zv_cookie') === 'rejected') return;
    const params = new URLSearchParams(window.location.search);
    const source = params.get('utm_source') || (document.referrer ? new URL(document.referrer).hostname : 'direct');
    api.post('/public/events', { type, path: window.location.pathname, referrer: document.referrer, source, visitorId: visitorId(), meta }).catch(() => {});
  } catch {
    /* noop */
  }
}

export const SERVICES = ['Web Development', 'Web & Mobile App Development', 'Web Design', 'Digital Marketing', 'B2B Lead Generation', 'Data Entry Services', 'Other'];
export const INDUSTRIES = ['E-commerce & Retail', 'SaaS & Technology', 'Real Estate', 'Home Services & Trades', 'Education & Training', 'Healthcare & Clinics', 'Professional Services', 'Other'];
export const BUDGETS = ['< $2k', '$2k – $5k', '$5k – $15k', '$15k – $50k', '$50k+', 'Not sure yet'];
export const TIMELINES = ['ASAP', '1 – 3 months', '3 – 6 months', 'Just exploring'];
export const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Netherlands', 'Ireland', 'Sweden', 'Norway', 'Denmark', 'Switzerland', 'Italy', 'Spain', 'United Arab Emirates', 'Saudi Arabia', 'Singapore', 'India', 'Bangladesh', 'New Zealand', 'Other'];
export const LEAD_SOURCES_FORM = ['Google search', 'LinkedIn', 'Referral', 'Upwork / Fiverr', 'Social media', 'Event', 'Other'];
