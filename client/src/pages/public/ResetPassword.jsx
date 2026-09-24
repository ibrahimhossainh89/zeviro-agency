import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import Seo from '../../components/Seo';
import { Logo } from '../../components/Navbar';
import { Field, Input, Button, ErrorBox, SuccessBox } from '../../components/ui';
import { api, errMsg } from '../../api/http';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [email, setEmail] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [state, setState] = useState({ loading: false, error: '', ok: '' });

  const submit = async (e) => {
    e.preventDefault();
    if (token && password !== confirm) return setState({ loading: false, error: 'Passwords do not match', ok: '' });
    setState({ loading: true, error: '', ok: '' });
    try {
      if (token) {
        await api.post('/auth/reset-password', { email, token, password });
        setState({ loading: false, error: '', ok: 'Password updated. You can now log in.' });
      } else {
        await api.post('/auth/forgot-password', { email });
        setState({ loading: false, error: '', ok: 'If an account exists for that email, a reset link is on its way.' });
      }
    } catch (err) {
      setState({ loading: false, error: errMsg(err), ok: '' });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Seo title="Reset password" noindex />
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <form onSubmit={submit} className="card space-y-5 p-8">
          <div className="text-center">
            <KeyRound className="mx-auto mb-3 h-8 w-8 text-brand-300" />
            <h1 className="text-2xl font-semibold">{token ? 'Set a new password' : 'Forgot your password?'}</h1>
            <p className="mt-1 text-sm text-slate-400">{token ? 'Min. 8 characters, one uppercase letter and a number.' : "Enter your email and we'll send a reset link."}</p>
          </div>
          <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          {token && (
            <>
              <Field label="New password"><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></Field>
              <Field label="Confirm password"><Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></Field>
            </>
          )}
          <ErrorBox>{state.error}</ErrorBox>
          <SuccessBox>{state.ok}</SuccessBox>
          <Button type="submit" loading={state.loading} className="w-full">{token ? 'Update password' : 'Send reset link'}</Button>
          <p className="text-center text-sm"><Link to="/login" className="text-slate-400 hover:text-white">← Back to login</Link></p>
        </form>
      </div>
    </div>
  );
}
