import { useState } from 'react';
import { BadgeCheck, MailCheck, Smartphone } from 'lucide-react';
import { api, errMsg } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { Button, Input, ErrorBox } from './ui';

/** Email status + phone verification (a verified phone can receive login codes by SMS). */
export default function PhoneVerify() {
  const { user, setUser } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [step, setStep] = useState('idle'); // idle | code
  const [code, setCode] = useState('');
  const [state, setState] = useState({ loading: false, error: '', ok: '' });
  const run = async (fn, ok) => {
    setState({ loading: true, error: '', ok: '' });
    try {
      await fn();
      setState({ loading: false, error: '', ok });
    } catch (e) {
      setState({ loading: false, error: errMsg(e), ok: '' });
    }
  };
  return (
    <div className="card space-y-4 p-5">
      <h2 className="font-semibold">Sign-in verification</h2>
      <div className="flex items-center gap-2 text-sm">
        <MailCheck className="h-4 w-4 text-brand-300" />
        <span className="text-slate-300">{user?.email}</span>
        {user?.emailVerified ? <span className="flex items-center gap-1 text-xs text-emerald-400"><BadgeCheck className="h-3.5 w-3.5" /> Verified</span> : <span className="text-xs text-amber-400">Not verified yet</span>}
      </div>
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm text-slate-300">
          <Smartphone className="h-4 w-4 text-brand-300" /> Mobile number for SMS codes
          {user?.phoneVerified && <span className="flex items-center gap-1 text-xs text-emerald-400"><BadgeCheck className="h-3.5 w-3.5" /> Verified</span>}
        </p>
        {step === 'idle' ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input type="tel" placeholder="+8801XXXXXXXXX or +1…" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Button variant="ghost" loading={state.loading} disabled={!phone.trim()} onClick={() => run(async () => { await api.post('/auth/me/phone/send', { phone }); setStep('code'); }, 'We sent a 6-digit code by SMS.')}>
              {user?.phoneVerified && phone === user.phone ? 'Verify again' : 'Send code'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input inputMode="numeric" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            <Button loading={state.loading} disabled={code.length !== 6} onClick={() => run(async () => { const r = await api.post('/auth/me/phone/verify', { code }); setUser(r.user); setStep('idle'); setCode(''); }, 'Phone number verified. You can now receive login codes by SMS.')}>Verify</Button>
            <Button variant="ghost" onClick={() => setStep('idle')}>Cancel</Button>
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">Use the full international format. When you sign in, you can choose to get your code by SMS instead of email.</p>
      </div>
      <ErrorBox>{state.error}</ErrorBox>
      {state.ok && <p className="text-sm text-emerald-400">{state.ok}</p>}
    </div>
  );
}
