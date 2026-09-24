import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import Seo from '../../components/Seo';
import AuthLayout from '../../components/AuthLayout';
import { Field, Input, PasswordInput, Select, Button, ErrorBox } from '../../components/ui';
import { useAuth, STAFF_ROLES } from '../../context/AuthContext';
import { errMsg } from '../../api/http';
import { COUNTRIES, cn } from '../../lib/utils';
import VerifyCode from '../../components/VerifyCode';

const RULES = [
  ['8+ characters', (p) => p.length >= 8],
  ['Uppercase letter', (p) => /[A-Z]/.test(p)],
  ['Lowercase letter', (p) => /[a-z]/.test(p)],
  ['Number', (p) => /[0-9]/.test(p)],
];

export default function Signup() {
  const { register, user, ready } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ name: '', email: '', company: '', country: '', phone: '', password: '', acceptTerms: false, marketingOptIn: false, company_website: '' });
  const [state, setState] = useState({ loading: false, error: '' });
  const [verify, setVerify] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const passed = useMemo(() => RULES.filter(([, t]) => t(f.password)).length, [f.password]);

  if (ready && user && !STAFF_ROLES.includes(user.role)) return <Navigate to={loc.state?.from || '/portal'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (passed < RULES.length) return setState({ loading: false, error: 'Please choose a stronger password.' });
    if (!f.acceptTerms) return setState({ loading: false, error: 'Please accept the Terms of Service and Privacy Policy.' });
    setState({ loading: true, error: '' });
    try {
      const r = await register({ ...f, name: f.name.trim(), email: f.email.trim() });
      if (r?.verify) {
        setVerify(r.verify);
        setState({ loading: false, error: '' });
      }
    } catch (err) {
      setState({ loading: false, error: errMsg(err) });
    }
  };

  if (verify) {
    return (
      <AuthLayout>
        <Seo title="Confirm your email" noindex />
        <VerifyCode verify={verify} onVerified={() => nav(loc.state?.from || '/portal', { replace: true })} />
      </AuthLayout>
    );
  }

  const strength = ['bg-ink-600', 'bg-rose-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500'][passed];

  return (
    <AuthLayout>
      <Seo title="Create your account" description="Create a free Zeviro client account to order services, track projects and pay invoices online." />
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Create your client account</h1>
        <p className="mt-2 text-slate-400">Free forever. Order services, follow progress and chat with our team.</p>
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name *"><Input autoComplete="name" required value={f.name} onChange={set('name')} placeholder="Jane Cooper" /></Field>
          <Field label="Company"><Input autoComplete="organization" value={f.company} onChange={set('company')} placeholder="Optional" /></Field>
        </div>
        <Field label="Work email *"><Input type="email" autoComplete="email" required value={f.email} onChange={set('email')} placeholder="you@company.com" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Country"><Select value={f.country} onChange={set('country')} options={COUNTRIES} placeholder="Select…" /></Field>
          <Field label="Phone / WhatsApp"><Input type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} placeholder="Optional" /></Field>
        </div>
        <Field label="Password *">
          <PasswordInput autoComplete="new-password" required value={f.password} onChange={set('password')} />
          <div className="mt-2 flex gap-1">{RULES.map((_, i) => <span key={i} className={cn('h-1 flex-1 rounded-full transition', i < passed ? strength : 'bg-ink-600')} />)}</div>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
            {RULES.map(([label, test]) => {
              const ok = test(f.password);
              return (
                <li key={label} className={cn('flex items-center gap-1.5', ok ? 'text-emerald-400' : 'text-slate-500')}>
                  {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} {label}
                </li>
              );
            })}
          </ul>
        </Field>
        {/* honeypot — hidden from people, bots fill it */}
        <input type="text" name="company_website" value={f.company_website} onChange={set('company_website')} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <label className="flex items-start gap-3 text-sm text-slate-300">
          <input type="checkbox" checked={f.acceptTerms} onChange={set('acceptTerms')} className="mt-0.5 h-4 w-4 rounded accent-violet-500" />
          <span>I agree to the <Link to="/policies/terms-of-service" target="_blank" className="text-brand-300 underline">Terms of Service</Link> and <Link to="/policies/privacy-policy" target="_blank" className="text-brand-300 underline">Privacy Policy</Link>.</span>
        </label>
        <label className="flex items-start gap-3 text-sm text-slate-400">
          <input type="checkbox" checked={f.marketingOptIn} onChange={set('marketingOptIn')} className="mt-0.5 h-4 w-4 rounded accent-violet-500" />
          <span>Send me occasional tips and offers (unsubscribe any time).</span>
        </label>
        <ErrorBox>{state.error}</ErrorBox>
        <Button type="submit" loading={state.loading} className="w-full py-3">Create account</Button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-400">
        Already have an account? <Link to="/login" state={loc.state} className="font-medium text-brand-300 hover:underline">Log in</Link>
      </p>
    </AuthLayout>
  );
}
