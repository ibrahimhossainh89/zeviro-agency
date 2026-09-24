import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Lock, RefreshCcw, ShieldCheck, UserPlus, LogIn, Plus, X } from 'lucide-react';
import Seo from '../../components/Seo';
import { PageLoader, Field, Input, Textarea, Button, ErrorBox } from '../../components/ui';
import { useAuth, STAFF_ROLES } from '../../context/AuthContext';
import { api, errMsg } from '../../api/http';
import { useFetch, fmtMoney, cn, toInputDate } from '../../lib/utils';
import NotFound from './NotFound';

// What we need to start, per service (shown as guidance above the requirements box)
const BRIEF_HINTS = {
  'data-entry-services': 'Tell us the source (PDF, website, images, CRM…), the fields/columns you need, the number of records and the output format (Excel, Google Sheets, CSV).',
  'b2b-lead-generation': 'Describe your ideal customer: industry, location, company size, job titles, number of leads, and which fields you need (e.g. name, title, email, LinkedIn, phone).',
  'web-development': 'Share your business, the pages/features you need, any design references or Figma files, your domain/hosting situation and your deadline.',
  'web-and-mobile-app-development': 'Describe the app idea, target users, core features (login, payments, dashboards…), platforms (web, Android, iOS) and any existing designs or APIs.',
  'web-design': 'Tell us about your brand, the pages to design, websites you like and dislike, and whether you need the design developed afterwards.',
  'digital-marketing': 'Share your website, target audience and locations, goals (traffic, leads, sales), current channels and monthly budget.',
};

export default function Checkout() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { user, ready } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const { data: service, loading, error } = useFetch(`/public/content/services/${slug}`);
  const [f, setF] = useState({ requirements: '', referenceLinks: [''], preferredDeadline: '' });
  const [state, setState] = useState({ loading: false, error: '' });

  if (loading || !ready) return <PageLoader />;
  if (error || !service || !service.packages?.length) return <NotFound />;
  const pkgName = params.get('package') || service.packages.find((p) => p.popular)?.name || service.packages[0].name;
  const pkg = service.packages.find((p) => p.name === pkgName) || service.packages[0];
  const isClient = user && !STAFF_ROLES.includes(user.role);
  const here = loc.pathname + loc.search;

  const submit = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: '' });
    try {
      const order = await api.post('/portal/orders', {
        serviceSlug: service.slug,
        packageName: pkg.name,
        requirements: f.requirements,
        referenceLinks: f.referenceLinks.map((l) => l.trim()).filter(Boolean),
        preferredDeadline: f.preferredDeadline || undefined,
      });
      nav(`/portal/orders/${order._id}?new=1`, { replace: true });
    } catch (err) {
      setState({ loading: false, error: errMsg(err) });
    }
  };

  const setLink = (i, v) => setF({ ...f, referenceLinks: f.referenceLinks.map((x, j) => (j === i ? v : x)) });

  return (
    <>
      <Seo title={`Order ${service.title}`} noindex />
      <section className="container-x py-12 sm:py-16">
        <Link to={`/services/${service.slug}`} className="mb-6 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to {service.title}</Link>
        <h1 className="text-3xl font-semibold sm:text-4xl">Order: {service.title}</h1>
        <ol className="mt-6 flex flex-wrap items-center gap-2 text-xs font-medium sm:text-sm">
          {['Choose package', 'Account', 'Requirements', 'Payment'].map((s, i) => {
            const step = isClient ? 2 : 1;
            return (
              <li key={s} className="flex items-center gap-2">
                <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[11px]', i < step ? 'bg-emerald-500 text-snow' : i === step ? 'bg-brand-gradient text-snow' : 'bg-ink-700 text-slate-400')}>{i < step ? '✓' : i + 1}</span>
                <span className={i <= step ? 'text-white' : 'text-slate-500'}>{s}</span>
                {i < 3 && <span className="mx-1 h-px w-6 bg-ink-600" />}
              </li>
            );
          })}
        </ol>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            {/* package switcher */}
            <div className="card p-5">
              <p className="mb-3 text-sm font-medium text-slate-300">Package</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {service.packages.map((p) => (
                  <button key={p.name} type="button" onClick={() => setParams({ package: p.name }, { replace: true })} className={cn('rounded-xl border p-4 text-left transition', p.name === pkg.name ? 'border-brand-500 bg-brand-500/10' : 'border-ink-600 hover:border-ink-500')}>
                    <p className="text-sm font-semibold text-white">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.title}</p>
                    <p className="mt-2 font-display text-lg text-white">{p.price ? fmtMoney(p.price) : <span className="text-sm text-brand-300">On request</span>}</p>
                  </button>
                ))}
              </div>
            </div>

            {!isClient ? (
              <div className="card p-6 sm:p-8">
                <h2 className="text-xl font-semibold">Create an account to place your order</h2>
                <p className="mt-2 text-sm text-slate-400">Your account keeps your order, messages, files and invoices in one secure place. It takes less than a minute.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/signup" state={{ from: here }} className="btn-primary"><UserPlus className="h-4 w-4" /> Create free account</Link>
                  <Link to="/login" state={{ from: here }} className="btn-ghost"><LogIn className="h-4 w-4" /> I already have an account</Link>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="card space-y-5 p-6 sm:p-8">
                <div>
                  <h2 className="text-xl font-semibold">Tell us what you need</h2>
                  <p className="mt-1 text-sm text-slate-400">{BRIEF_HINTS[service.slug] || 'Describe the work, the result you expect, and anything we should know before starting.'}</p>
                </div>
                <Field label="Project requirements *" hint="The clearer the brief, the faster we deliver. You can attach files from your portal after ordering.">
                  <Textarea rows={8} required minLength={20} value={f.requirements} onChange={(e) => setF({ ...f, requirements: e.target.value })} />
                </Field>
                <Field label="Reference links (optional)" hint="Google Drive / Sheets, example websites, Figma, LinkedIn searches…">
                  <div className="space-y-2">
                    {f.referenceLinks.map((l, i) => (
                      <div key={i} className="flex gap-2">
                        <Input type="url" placeholder="https://" value={l} onChange={(e) => setLink(i, e.target.value)} />
                        {f.referenceLinks.length > 1 && <button type="button" onClick={() => setF({ ...f, referenceLinks: f.referenceLinks.filter((_, j) => j !== i) })} className="rounded-lg px-2 text-slate-500 hover:text-rose-300" aria-label="Remove link"><X className="h-4 w-4" /></button>}
                      </div>
                    ))}
                    {f.referenceLinks.length < 5 && <button type="button" className="btn-ghost btn-sm" onClick={() => setF({ ...f, referenceLinks: [...f.referenceLinks, ''] })}><Plus className="h-3.5 w-3.5" /> Add link</button>}
                  </div>
                </Field>
                <Field label="Preferred deadline (optional)"><Input type="date" min={toInputDate(new Date(Date.now() + 864e5))} value={f.preferredDeadline} onChange={(e) => setF({ ...f, preferredDeadline: e.target.value })} className="sm:w-60" /></Field>
                <ErrorBox>{state.error}</ErrorBox>
                <Button type="submit" loading={state.loading} className="w-full py-3">
                  <Lock className="h-4 w-4" /> {pkg.price ? `Place order · ${fmtMoney(pkg.price)}` : 'Request price'}
                </Button>
                <p className="text-center text-xs text-slate-500">
                  By placing an order you agree to our <Link to="/policies/terms-of-service" className="underline">Terms</Link> and <Link to="/policies/refund-and-cancellation-policy" className="underline">Refund Policy</Link>. {pkg.price ? 'You will pay on the next step — nothing is charged yet.' : 'We will send you a fixed price and delivery date, usually within a few hours. Nothing is charged now — you pay only if you accept.'}
                </p>
              </form>
            )}
          </div>

          {/* summary */}
          <aside className="h-fit space-y-4 lg:sticky lg:top-24">
            <div className="card p-6">
              <p className="text-xs uppercase tracking-wider text-slate-500">Order summary</p>
              <h3 className="mt-2 font-semibold text-white">{service.title}</h3>
              <p className="text-sm text-brand-300">{pkg.name}{pkg.title ? ` · ${pkg.title}` : ''}</p>
              {pkg.description && <p className="mt-3 text-sm text-slate-400">{pkg.description}</p>}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300">
                {pkg.deliveryDays ? <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-brand-300" />{pkg.deliveryDays}-day delivery</span> : null}
                {pkg.revisions ? <span className="flex items-center gap-1.5"><RefreshCcw className="h-4 w-4 text-brand-300" />{pkg.revisions} revisions</span> : null}
              </div>
              {pkg.features?.length > 0 && <ul className="mt-4 space-y-2">{pkg.features.map((x) => <li key={x} className="flex gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />{x}</li>)}</ul>}
              <div className="mt-6 flex items-center justify-between border-t border-ink-600/60 pt-4">
                <span className="text-slate-400">Total</span>
                <span className="font-display text-2xl font-semibold text-white">{pkg.price ? fmtMoney(pkg.price) : <span className="text-lg">Price on request</span>}</span>
              </div>
            </div>
            <div className="card flex gap-3 p-5 text-sm text-slate-400">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
              <p>Work starts after payment. You get a dedicated order page with status updates, real-time messages and your invoice.</p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
