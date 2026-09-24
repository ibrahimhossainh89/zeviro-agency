import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, Users } from 'lucide-react';
import Seo from '../../components/Seo';
import { Logo } from '../../components/Navbar';
import AuthLayout from '../../components/AuthLayout';
import ThemeSwitcher from '../../components/ThemeSwitcher';
import { Field, Input, PasswordInput, Button, ErrorBox } from '../../components/ui';
import { useAuth, STAFF_ROLES } from '../../context/AuthContext';
import { errMsg } from '../../api/http';
import { siteUrl } from '../../lib/portal';
import VerifyCode from '../../components/VerifyCode';

function useLoginForm(home) {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ email: '', password: '' });
  const [state, setState] = useState({ loading: false, error: '' });
  const [verify, setVerify] = useState(null);
  const done = () => nav(loc.state?.from || home, { replace: true });
  const submit = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: '' });
    try {
      const r = await login(f.email.trim(), f.password);
      if (r?.verify) {
        setVerify(r.verify);
        setState({ loading: false, error: '' });
      } else done();
    } catch (err) {
      setState({ loading: false, error: errMsg(err) });
    }
  };
  return { f, setF, state, submit, verify, setVerify, done };
}

/** Client login (zeviro.agency/login) */
function ClientLogin() {
  const { user, ready } = useAuth();
  const loc = useLocation();
  const { f, setF, state, submit, verify, setVerify, done } = useLoginForm('/portal');
  if (ready && user && !STAFF_ROLES.includes(user.role)) return <Navigate to={loc.state?.from || '/portal'} replace />;
  if (verify) return <AuthLayout><Seo title="Verify" noindex /><VerifyCode verify={verify} onVerified={done} onBack={() => setVerify(null)} /></AuthLayout>;
  return (
    <AuthLayout>
      <Seo title="Log in" description="Log in to your Zeviro client portal." noindex />
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Welcome back</h1>
        <p className="mt-2 text-slate-400">Log in to your client portal to manage orders, projects and invoices.</p>
      </div>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Email address"><Input type="email" autoComplete="email" required autoFocus value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@company.com" /></Field>
        <Field label={<span className="flex items-center justify-between">Password <Link to="/reset-password" className="text-xs font-normal text-brand-300 hover:underline">Forgot password?</Link></span>}>
          <PasswordInput autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </Field>
        <ErrorBox>{state.error}</ErrorBox>
        <Button type="submit" loading={state.loading} className="w-full py-3">Log in</Button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-400">
        New to Zeviro? <Link to="/signup" state={loc.state} className="font-medium text-brand-300 hover:underline">Create a free account</Link>
      </p>
    </AuthLayout>
  );
}

/** Team (team.zeviro.agency/login) and Super Admin (admin.zeviro.agency/login) */
function StaffLogin({ variant }) {
  const { user, ready } = useAuth();
  const { f, setF, state, submit, verify, setVerify, done } = useLoginForm('/admin');
  const admin = variant === 'admin';
  if (ready && user && STAFF_ROLES.includes(user.role)) return <Navigate to="/admin" replace />;
  const I = admin ? ShieldCheck : Users;
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <Seo title={admin ? 'Admin Console' : 'Team Portal'} noindex />
      <div className="bg-grid-fade pointer-events-none absolute inset-0" />
      <div className={`glow-orb pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full ${admin ? 'bg-fuchsia-800/50' : 'bg-indigo-700/60'}`} />
      <div className="absolute right-4 top-4"><ThemeSwitcher /></div>
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo />
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${admin ? 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300' : 'border-brand-500/40 bg-brand-500/10 text-brand-300'}`}>
            <I className="h-3.5 w-3.5" /> {admin ? 'Super Admin Console' : 'Team Portal'}
          </span>
        </div>
        {verify ? (
          <div className="card bg-ink-850/90 p-8"><VerifyCode verify={verify} onVerified={done} onBack={() => setVerify(null)} /></div>
        ) : (
        <form onSubmit={submit} className="card space-y-5 bg-ink-850/90 p-8">
          <div className="text-center">
            <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300"><Lock className="h-5 w-5" /></span>
            <h1 className="text-2xl font-semibold">{admin ? 'Administrator sign in' : 'Team sign in'}</h1>
            <p className="mt-1 text-sm text-slate-400">{admin ? 'Restricted to the Zeviro super administrator.' : 'For Zeviro team members only.'}</p>
          </div>
          <Field label="Work email"><Input type="email" autoComplete="username" required autoFocus value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Password"><PasswordInput autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <ErrorBox>{state.error}</ErrorBox>
          <Button type="submit" loading={state.loading} className="w-full">Sign in</Button>
          <p className="text-center text-xs text-slate-500"><Link to="/reset-password" className="underline hover:text-white">Forgot your password?</Link></p>
        </form>
        )}
        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" /> Authorised access only. Sign-ins are logged.
        </p>
        <p className="mt-2 text-center text-xs text-slate-500">
          Looking for the client portal? <a href={siteUrl('/login')} className="underline hover:text-white">Client login</a>
        </p>
      </div>
    </div>
  );
}

export default function Login({ variant = 'client' }) {
  return variant === 'client' ? <ClientLogin /> : <StaffLogin variant={variant} />;
}
