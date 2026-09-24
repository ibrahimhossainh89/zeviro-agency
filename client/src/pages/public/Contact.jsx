import { useMemo, useRef, useState } from 'react';
import { Mail, Phone, MapPin, Clock, CalendarCheck, CheckCircle2, Video } from 'lucide-react';
import Seo from '../../components/Seo';
import LeadForm from '../../components/LeadForm';
import { Field, Input, Select, Textarea, Button, ErrorBox } from '../../components/ui';
import { useSite } from '../../context/SiteContext';
import { api, errMsg } from '../../api/http';
import { SERVICES, cn } from '../../lib/utils';
import { PageHero } from './shared';
import SocialIcons from '../../components/SocialIcons';

export function Contact() {
  const { settings } = useSite();
  return (
    <>
      <Seo title="Contact" description="Tell us about your project. Zeviro replies within one business day." />
      <PageHero eyebrow="Contact" title="Let's build something great together" text="Tell us about your project and we'll get back to you within one business day." />
      <section className="container-x grid gap-10 py-16 lg:grid-cols-[1fr_2fr]">
        <aside className="space-y-4">
          {[[Mail, 'Email', settings.contactEmail, settings.contactEmail && `mailto:${settings.contactEmail}`], [Phone, 'Phone', settings.contactPhone], [MapPin, 'Location', settings.address], [Clock, 'Response time', 'Within one business day']]
            .filter(([, , v]) => v)
            .map(([I, l, v, href]) => (
              <div key={l} className="card flex gap-4 p-5">
                <span className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-2.5 text-brand-300"><I className="h-5 w-5" /></span>
                <div><p className="text-xs uppercase tracking-wide text-slate-500">{l}</p>{href ? <a href={href} className="font-medium text-white hover:underline">{v}</a> : <p className="font-medium text-white">{v}</p>}</div>
              </div>
            ))}
          <div className="card p-5">
            <p className="mb-3 font-medium text-white">Follow Zeviro</p>
            <SocialIcons size="sm" />
          </div>
          <div className="card p-5">
            <p className="font-medium text-white">Prefer to talk?</p>
            <p className="mt-1 text-sm text-slate-400">Book a free 30-minute discovery call.</p>
            <a href="/book-a-call" className="btn-primary btn-sm mt-4">Book a call</a>
          </div>
        </aside>
        <LeadForm />
      </section>
    </>
  );
}

// Next 10 business days, 09:00–17:00 slots (visitor local time)
function useSlots() {
  return useMemo(() => {
    const days = [];
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    while (days.length < 10) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
    }
    return days;
  }, []);
}
const TIMES = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

export function BookCall() {
  const { settings } = useSite();
  const days = useSlots();
  const [day, setDay] = useState(null);
  const [time, setTime] = useState('');
  const [f, setF] = useState({ name: '', email: '', company: '', phone: '', website: '', service: '', agenda: '' });
  const [state, setState] = useState({ loading: false, error: '', done: false });
  const hp = useRef();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const submit = async (e) => {
    e.preventDefault();
    if (!day || !time) return setState({ ...state, error: 'Please pick a day and time' });
    if (f.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setState({ ...state, error: 'Please enter your name and a valid email' });
    const [h, m] = time.split(':').map(Number);
    const when = new Date(day);
    when.setHours(h, m, 0, 0);
    setState({ loading: true, error: '', done: false });
    try {
      await api.post('/public/appointments', { ...f, startsAt: when.toISOString(), timezone: tz, company_website: hp.current?.value || '' });
      setState({ loading: false, error: '', done: when });
    } catch (err) {
      setState({ loading: false, error: errMsg(err), done: false });
    }
  };

  return (
    <>
      <Seo title="Book a Discovery Call" description="Book a free 30-minute discovery call with Zeviro." />
      <PageHero eyebrow="Book a Discovery Call" title="Free 30-minute discovery call" text="We'll discuss your goals, answer questions and outline next steps — no obligation." />
      <section className="container-x grid gap-10 py-16 lg:grid-cols-[1fr_1.6fr]">
        <aside className="space-y-4">
          {[[Video, 'Online video call', 'Google Meet or Zoom — link sent on confirmation'], [Clock, '30 minutes', 'Focused and practical'], [CalendarCheck, 'Clear next steps', 'Scope, timeline and ballpark budget']].map(([I, t, d]) => (
            <div key={t} className="card flex gap-4 p-5"><I className="h-5 w-5 text-brand-300" /><div><p className="font-medium text-white">{t}</p><p className="text-sm text-slate-400">{d}</p></div></div>
          ))}
          {settings.calendlyUrl && (
            <a href={settings.calendlyUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full">Prefer our calendar tool? Book here →</a>
          )}
        </aside>

        {state.done ? (
          <div className="card flex flex-col items-center p-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            <h2 className="mt-4 text-2xl font-semibold">Request received!</h2>
            <p className="mt-2 max-w-md text-slate-400">We've noted <span className="text-white">{state.done.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}</span> ({tz}). We'll confirm by email with a meeting link shortly.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="card space-y-6 p-6 sm:p-8">
            <input ref={hp} name="company_website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <div>
              <p className="label">1. Pick a day</p>
              <div className="grid grid-cols-5 gap-2">
                {days.map((d) => (
                  <button type="button" key={d.toISOString()} onClick={() => { setDay(d); setTime(''); }} className={cn('rounded-xl border px-2 py-3 text-center text-xs transition', day?.getTime() === d.getTime() ? 'border-brand-500 bg-brand-500/20 text-white' : 'border-ink-600 text-slate-400 hover:border-brand-500/50')}>
                    <span className="block">{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                    <span className="block font-display text-lg font-semibold text-white">{d.getDate()}</span>
                    <span className="block">{d.toLocaleDateString(undefined, { month: 'short' })}</span>
                  </button>
                ))}
              </div>
            </div>
            {day && (
              <div>
                <p className="label">2. Pick a time ({tz})</p>
                <div className="grid grid-cols-4 gap-2">
                  {TIMES.map((t) => (
                    <button type="button" key={t} onClick={() => setTime(t)} className={cn('rounded-lg border py-2 text-sm', time === t ? 'border-brand-500 bg-brand-500/20 text-white' : 'border-ink-600 text-slate-300 hover:border-brand-500/50')}>{t}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="label">3. Your details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name *"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
                <Field label="Business email *"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
                <Field label="Company"><Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
                <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
                <Field label="Website"><Input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></Field>
                <Field label="Service"><Select value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} options={SERVICES} placeholder="Select" /></Field>
              </div>
              <Field label="What would you like to discuss?" className="mt-4"><Textarea rows={3} value={f.agenda} onChange={(e) => setF({ ...f, agenda: e.target.value })} /></Field>
            </div>
            <ErrorBox>{state.error}</ErrorBox>
            <Button type="submit" loading={state.loading} className="w-full">Request this time</Button>
          </form>
        )}
      </section>
    </>
  );
}
