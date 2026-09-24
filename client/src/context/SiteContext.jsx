import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api/http';
import { useSocketEvent } from '../lib/realtime';
import { useFetch } from '../lib/utils';

const SiteCtx = createContext({ settings: {}, nav: { services: [], solutions: [], industries: [], policies: [] } });

export function SiteProvider({ children }) {
  const [settings, setSettings] = useState({});
  const [nav, setNav] = useState({ services: [], solutions: [], industries: [], policies: [] });

  const [version, setVersion] = useState(0);
  const load = () => {
    api.get('/public/settings').then(setSettings).catch(() => {});
    api.get('/public/nav').then((n) => setNav({ policies: [], ...n })).catch(() => {});
  };
  useEffect(load, []);
  // The admin saved settings or CMS content → refresh instantly (no page reload)
  useSocketEvent('site:update', () => {
    load();
    setVersion((v) => v + 1);
  });

  // Optional Google Analytics / GTM injection (only if configured and cookies accepted)
  useEffect(() => {
    let consent = null;
    try {
      consent = localStorage.getItem('zv_cookie');
    } catch {
      /* noop */
    }
    if (consent !== 'accepted') return;
    if (settings.gaMeasurementId && !document.getElementById('ga-src')) {
      const s = document.createElement('script');
      s.id = 'ga-src';
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${settings.gaMeasurementId}`;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() {
        window.dataLayer.push(arguments); // eslint-disable-line prefer-rest-params
      };
      window.gtag('js', new Date());
      window.gtag('config', settings.gaMeasurementId);
    }
  }, [settings.gaMeasurementId]);

  // Optional third-party live chat (e.g. Tawk.to / Crisp) — Admin → Settings → "Live chat script URL"
  useEffect(() => {
    const src = settings.liveChatEmbed;
    if (!src || !/^https:\/\//.test(src) || document.getElementById('livechat-src')) return;
    if (/^\/(admin|portal)/.test(window.location.pathname)) return;
    const s = document.createElement('script');
    s.id = 'livechat-src';
    s.async = true;
    s.src = src;
    document.body.appendChild(s);
  }, [settings.liveChatEmbed]);

  return <SiteCtx.Provider value={{ settings, nav, version }}>{children}</SiteCtx.Provider>;
}

export const useSite = () => useContext(SiteCtx);

/** Like useFetch, but re-fetches automatically whenever the admin changes website content. */
export function useLiveFetch(url, params, opts) {
  const { version } = useSite();
  const r = useFetch(url, params, opts);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    r.refresh?.(); // silent: keep showing the old data until the new data arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
  return r;
}
