import { useEffect, useRef, useState } from 'react';
import { Mail, MessageSquare, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button, ErrorBox } from './ui';
import { api, errMsg } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

/** 6-digit one-time code step used after sign-up and login. */
export default function VerifyCode({ verify, onVerified, onBack }) {
  const { verifyCode } = useAuth();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [info, setInfo] = useState(verify);
  const [wait, setWait] = useState(verify.resendIn || 45);
  const [state, setState] = useState({ loading: false, error: '', note: '' });
  const refs = useRef([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, [info.channel]);
  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = async (code) => {
    setState({ loading: true, error: '', note: '' });
    try {
      const user = await verifyCode(verify.ticket, code);
      onVerified?.(user);
    } catch (e) {
      setState({ loading: false, error: errMsg(e), note: '' });
      setDigits(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    }
  };
  const setAt = (i, v) => {
    const clean = v.replace(/\D/g, '');
    if (clean.length > 1) {
      // pasted the whole code
      const arr = clean.slice(0, 6).split('');
      const next = [...digits];
      arr.forEach((c, j) => { if (i + j < 6) next[i + j] = c; });
      setDigits(next);
      const done = next.join('');
      if (done.length === 6) submit(done);
      else refs.current[Math.min(i + arr.length, 5)]?.focus();
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 5) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) submit(next.join(''));
  };
  const resend = async (channel) => {
    setState({ loading: false, error: '', note: '' });
    try {
      const r = await api.post('/auth/verify/resend', { ticket: verify.ticket, channel });
      setInfo((x) => ({ ...x, ...r }));
      setWait(r.resendIn || 45);
      setDigits(['', '', '', '', '', '']);
      setState({ loading: false, error: '', note: channel === 'sms' ? 'Code sent by SMS.' : 'A new code is on its way.' });
    } catch (e) {
      setState({ loading: false, error: errMsg(e), note: '' });
    }
  };

  const sms = info.channel === 'sms';
  return (
    <div>
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">{sms ? <MessageSquare className="h-6 w-6" /> : <Mail className="h-6 w-6" />}</span>
      <h1 className="text-2xl font-semibold">{verify.purpose === 'signup' ? 'Confirm your email' : 'Enter your verification code'}</h1>
      <p className="mt-2 text-sm text-slate-400">
        We sent a 6-digit code {sms ? 'by SMS to' : 'to'} <b className="text-white">{info.to || (sms ? 'your phone' : 'your email')}</b>. It expires in 10 minutes.
      </p>
      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (digits.every(Boolean)) submit(digits.join(''));
        }}
      >
        <div className="flex justify-between gap-2" onPaste={(e) => { e.preventDefault(); setAt(0, e.clipboardData.getData('text')); }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              value={d}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus(); }}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={6}
              aria-label={`Digit ${i + 1}`}
              className={cn('input h-14 w-full text-center font-display text-2xl font-semibold tracking-widest', d && 'border-brand-500')}
            />
          ))}
        </div>
        <ErrorBox>{state.error}</ErrorBox>
        {state.note && <p className="mt-3 text-sm text-emerald-400">{state.note}</p>}
        <Button type="submit" loading={state.loading} className="mt-5 w-full py-3" disabled={!digits.every(Boolean)}><ShieldCheck className="h-4 w-4" /> Verify</Button>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <button type="button" disabled={wait > 0} onClick={() => resend(info.channel)} className="text-brand-300 hover:underline disabled:text-slate-500 disabled:no-underline">
          {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
        </button>
        {verify.canUseSms && (
          <button type="button" onClick={() => resend(sms ? 'email' : 'sms')} className="text-slate-400 hover:text-white">
            {sms ? 'Send code by email instead' : 'Send code by SMS instead'}
          </button>
        )}
      </div>
      {onBack && <button type="button" onClick={onBack} className="mt-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back</button>}
      <p className="mt-6 text-xs text-slate-500">Can't find the email? Check your spam folder. Never share this code with anyone — Zeviro will never ask for it.</p>
    </div>
  );
}
