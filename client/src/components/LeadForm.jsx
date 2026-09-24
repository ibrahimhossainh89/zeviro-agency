import { useRef, useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { api, errMsg } from '../api/http';
import { Field, Input, Select, Textarea, Button, ErrorBox } from './ui';
import { SERVICES, INDUSTRIES, BUDGETS, TIMELINES, COUNTRIES, LEAD_SOURCES_FORM } from '../lib/utils';

const EMPTY = { fullName: '', company: '', email: '', phone: '', website: '', country: '', industry: '', service: '', budget: '', timeline: '', description: '', leadSource: '' };

function validate(f) {
  const e = {};
  if (f.fullName.trim().length < 2) e.fullName = 'Please enter your full name';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Please enter a valid business email';
  if (!f.service) e.service = 'Please choose a service';
  if (f.description.trim().length < 10) e.description = 'Tell us a little more (10+ characters)';
  if (f.website && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+/.test(f.website)) e.website = 'Please enter a valid URL';
  if (f.phone && !/^[+()\d\s-]{6,20}$/.test(f.phone)) e.phone = 'Please enter a valid phone number';
  return e;
}

export default function LeadForm({ defaultService = '', compact = false }) {
  const [f, setF] = useState({ ...EMPTY, service: defaultService });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ loading: false, error: '', done: null });
  const startedAt = useRef(Date.now());
  const honeypot = useRef();

  const set = (k) => (e) => {
    setF((s) => ({ ...s, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(f);
    setErrors(v);
    if (Object.keys(v).length) return;
    setStatus({ loading: true, error: '', done: null });
    try {
      const r = await api.post('/public/leads', { ...f, company_website: honeypot.current?.value || '', startedAt: startedAt.current, page: window.location.pathname });
      setStatus({ loading: false, error: '', done: r });
      setF(EMPTY);
      window.gtag?.('event', 'generate_lead', { service: f.service });
    } catch (err) {
      setStatus({ loading: false, error: errMsg(err), done: null });
    }
  };

  if (status.done)
    return (
      <div className="card flex flex-col items-center p-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
        <h3 className="mt-4 text-2xl font-semibold">Thank you — we've got it!</h3>
        <p className="mt-2 max-w-md text-slate-400">
          A Zeviro specialist will review your request and reply within one business day. We've also sent a confirmation to your inbox.
        </p>
        {status.done.reference && <p className="mt-4 rounded-lg bg-ink-700 px-3 py-1.5 font-mono text-sm text-brand-300">Reference: {status.done.reference}</p>}
        <Button variant="ghost" className="mt-6" onClick={() => setStatus({ loading: false, error: '', done: null })}>Send another inquiry</Button>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-6 sm:p-8">
      {/* honeypot — hidden from humans */}
      <input ref={honeypot} type="text" name="company_website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name *" error={errors.fullName}><Input value={f.fullName} onChange={set('fullName')} autoComplete="name" placeholder="Jane Doe" /></Field>
        <Field label="Company"><Input value={f.company} onChange={set('company')} autoComplete="organization" placeholder="Acme Inc." /></Field>
        <Field label="Business email *" error={errors.email}><Input type="email" value={f.email} onChange={set('email')} autoComplete="email" placeholder="jane@acme.com" /></Field>
        <Field label="Phone" error={errors.phone}><Input value={f.phone} onChange={set('phone')} autoComplete="tel" placeholder="+1 555 000 000" /></Field>
        {!compact && (
          <>
            <Field label="Website" error={errors.website}><Input value={f.website} onChange={set('website')} placeholder="acme.com" /></Field>
            <Field label="Country"><Select value={f.country} onChange={set('country')} options={COUNTRIES} placeholder="Select country" /></Field>
            <Field label="Industry"><Select value={f.industry} onChange={set('industry')} options={INDUSTRIES} placeholder="Select industry" /></Field>
          </>
        )}
        <Field label="Service required *" error={errors.service}><Select value={f.service} onChange={set('service')} options={SERVICES} placeholder="Select a service" /></Field>
        <Field label="Budget"><Select value={f.budget} onChange={set('budget')} options={BUDGETS} placeholder="Select budget" /></Field>
        <Field label="Timeline"><Select value={f.timeline} onChange={set('timeline')} options={TIMELINES} placeholder="Select timeline" /></Field>
      </div>
      <Field label="Project description *" error={errors.description}>
        <Textarea value={f.description} onChange={set('description')} rows={5} placeholder="What are you looking to build or achieve? Any links, goals or deadlines help." />
      </Field>
      {!compact && (
        <Field label="How did you hear about us?"><Select value={f.leadSource} onChange={set('leadSource')} options={LEAD_SOURCES_FORM} placeholder="Select an option" /></Field>
      )}
      <ErrorBox>{status.error}</ErrorBox>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-xs text-slate-500">By submitting, you agree to our <a href="/policies/privacy-policy" className="underline">Privacy Policy</a>. We never share your data.</p>
        <Button type="submit" loading={status.loading}>
          Send inquiry <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
