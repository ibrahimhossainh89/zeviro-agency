import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, X, Upload } from 'lucide-react';
import { api, http, errMsg } from '../api/http';
import { useFetch, toInputDate, toInputDateTime, cn, fmtMoney } from '../lib/utils';
import { getSocket } from '../lib/realtime';
import { Button, Modal, Field, Input, Select, Textarea, ErrorBox, PageHeader, Pagination, Empty, Spinner } from './ui';

// ---------- field helpers ----------
function toFormValue(field, v) {
  if (v === undefined || v === null) return field.type === 'checkbox' ? false : ['items', 'packages'].includes(field.type) ? [] : '';
  if (field.type === 'date') return toInputDate(v);
  if (field.type === 'datetime') return toInputDateTime(v);
  if (field.type === 'tags') return Array.isArray(v) ? v.join(', ') : v;
  if (field.type === 'lines') return Array.isArray(v) ? v.join('\n') : v;
  if (field.type === 'ref') return typeof v === 'object' ? v._id : v;
  if (field.type === 'refs') return (v || []).map((x) => (typeof x === 'object' ? x._id : x));
  if (field.type === 'packages') return (v || []).map((p) => ({ ...p, features: (p.features || []).join('\n'), price: p.price ?? '', deliveryDays: p.deliveryDays ?? '' }));
  return v;
}
function fromFormValue(field, v) {
  if (field.type === 'number') return v === '' ? undefined : Number(v);
  if (field.type === 'tags') return String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (field.type === 'lines') return String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);
  if (field.type === 'datetime' || field.type === 'date') return v ? new Date(v).toISOString() : null;
  if (field.type === 'ref') return v || null;
  if (field.type === 'packages')
    return (v || []).filter((p) => p.name).map((p) => ({
      name: p.name.trim(), title: p.title?.trim(), price: Number(p.price) || 0, deliveryDays: p.deliveryDays === '' ? undefined : Number(p.deliveryDays),
      revisions: p.revisions, description: p.description, features: String(p.features || '').split('\n').map((x) => x.trim()).filter(Boolean), popular: !!p.popular,
    }));
  if (field.type === 'items') return (v || []).map((i) => ({ description: i.description, quantity: Number(i.quantity) || 1, unitPrice: Number(i.unitPrice) || 0 }));
  return v;
}
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setPath = (o, p, v) => {
  const keys = p.split('.');
  const out = { ...o };
  let cur = out;
  keys.slice(0, -1).forEach((k) => {
    cur[k] = { ...(cur[k] || {}) };
    cur = cur[k];
  });
  cur[keys.at(-1)] = v;
  return out;
};

function RefSelect({ field, value, onChange }) {
  const { data } = useFetch(field.ref.endpoint, { limit: 200, ...(field.ref.params || {}) });
  const items = Array.isArray(data) ? data : data?.items || [];
  const label = (x) => (typeof field.ref.label === 'function' ? field.ref.label(x) : x[field.ref.label || 'name']);
  if (field.type === 'refs')
    return (
      <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-xl border border-ink-600 bg-ink-900 p-2">
        {items.map((x) => {
          const on = (value || []).includes(x._id);
          return (
            <button type="button" key={x._id} onClick={() => onChange(on ? value.filter((v) => v !== x._id) : [...(value || []), x._id])} className={cn('rounded-full border px-3 py-1 text-xs', on ? 'border-brand-500 bg-brand-500/20 text-white' : 'border-ink-600 text-slate-400')}>
              {label(x)}
            </button>
          );
        })}
      </div>
    );
  return <Select value={value || ''} onChange={(e) => onChange(e.target.value)} options={items.map((x) => ({ value: x._id, label: label(x) }))} placeholder={field.placeholder || '— Select —'} />;
}

function ItemsEditor({ value = [], onChange, currency }) {
  const set = (i, k, v) => onChange(value.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const total = value.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  return (
    <div className="space-y-2">
      {value.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_70px_110px_32px] gap-2">
          <Input placeholder="Description" value={it.description} onChange={(e) => set(i, 'description', e.target.value)} />
          <Input type="number" min="0" placeholder="Qty" value={it.quantity} onChange={(e) => set(i, 'quantity', e.target.value)} />
          <Input type="number" min="0" step="0.01" placeholder="Price" value={it.unitPrice} onChange={(e) => set(i, 'unitPrice', e.target.value)} />
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-slate-500 hover:text-rose-300" aria-label="Remove"><X className="h-4 w-4" /></button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button type="button" className="btn-ghost btn-sm" onClick={() => onChange([...value, { description: '', quantity: 1, unitPrice: 0 }])}><Plus className="h-3.5 w-3.5" /> Add line</button>
        <span className="text-sm text-slate-400">Subtotal: <span className="font-semibold text-white">{fmtMoney(total, currency)}</span></span>
      </div>
    </div>
  );
}

function ImageField({ value, onChange, uploadUrl = '/cms/upload' }) {
  const [state, setState] = useState({ loading: false, error: '' });
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setState({ loading: true, error: '' });
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { url } = await http.post(uploadUrl, fd).then((r) => r.data);
      onChange(url);
      setState({ loading: false, error: '' });
    } catch (err) {
      setState({ loading: false, error: errMsg(err) });
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Upload an image or paste a link" />
        <label className={cn('btn-ghost shrink-0 cursor-pointer', state.loading && 'pointer-events-none opacity-60')}>
          {state.loading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />} Upload
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={pick} />
        </label>
      </div>
      {state.error && <p className="text-xs text-rose-300">{state.error}</p>}
      {value && <img src={value} alt="" className="h-28 rounded-xl border border-ink-600 object-cover" onError={(e) => { e.currentTarget.style.opacity = 0.2; }} />}
    </div>
  );
}

const EMPTY_PKG = { name: '', title: '', price: '', deliveryDays: '', revisions: '', description: '', features: '', popular: false };
function PackagesEditor({ value = [], onChange }) {
  const set = (i, k, v) => onChange(value.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  return (
    <div className="space-y-3">
      {value.map((p, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-ink-600 bg-ink-900/60 p-3">
          <div className="grid gap-2 sm:grid-cols-[110px_1fr_110px_90px_90px_32px]">
            <Input placeholder="Basic" value={p.name} onChange={(e) => set(i, 'name', e.target.value)} aria-label="Package name" />
            <Input placeholder="Package title" value={p.title} onChange={(e) => set(i, 'title', e.target.value)} aria-label="Package title" />
            <Input type="number" min="0" step="0.01" placeholder="Price $" value={p.price} onChange={(e) => set(i, 'price', e.target.value)} aria-label="Price (0 = quote)" />
            <Input type="number" min="0" placeholder="Days" value={p.deliveryDays} onChange={(e) => set(i, 'deliveryDays', e.target.value)} aria-label="Delivery days" />
            <Input placeholder="Revisions" value={p.revisions} onChange={(e) => set(i, 'revisions', e.target.value)} aria-label="Revisions" />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-slate-500 hover:text-rose-300" aria-label="Remove package"><X className="h-4 w-4" /></button>
          </div>
          <Input placeholder="Short description" value={p.description} onChange={(e) => set(i, 'description', e.target.value)} />
          <Textarea rows={3} placeholder="Features — one per line" value={p.features} onChange={(e) => set(i, 'features', e.target.value)} />
          <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={!!p.popular} onChange={(e) => set(i, 'popular', e.target.checked)} className="accent-violet-500" /> Highlight as most popular</label>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button type="button" className="btn-ghost btn-sm" onClick={() => onChange([...value, { ...EMPTY_PKG, name: ['Basic', 'Standard', 'Premium'][value.length] || '' }])}><Plus className="h-3.5 w-3.5" /> Add package</button>
        <span className="text-xs text-slate-500">Price 0 = custom quote (client describes the job, you send a price)</span>
      </div>
    </div>
  );
}

export function ResourceForm({ fields, initial = {}, onSubmit, submitLabel = 'Save', onCancel }) {
  const [v, setV] = useState(() => Object.fromEntries(fields.map((f) => [f.name, toFormValue(f, getPath(initial, f.name) ?? f.default)])));
  const [state, setState] = useState({ loading: false, error: '' });
  const set = (name, val) => setV((s) => ({ ...s, [name]: val }));

  const submit = async (e) => {
    e.preventDefault();
    const missing = fields.filter((f) => f.required && (v[f.name] === '' || v[f.name] == null));
    if (missing.length) return setState({ loading: false, error: `Required: ${missing.map((m) => m.label).join(', ')}` });
    let body = {};
    fields.forEach((f) => {
      if (f.readOnly || (f.showIf && !f.showIf(v))) return;
      body = setPath(body, f.name, fromFormValue(f, v[f.name]));
    });
    setState({ loading: true, error: '' });
    try {
      await onSubmit(body);
      setState({ loading: false, error: '' });
    } catch (err) {
      setState({ loading: false, error: errMsg(err) });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          if (f.showIf && !f.showIf(v)) return null;
          const common = { value: v[f.name] ?? '', onChange: (e) => set(f.name, e.target.value), disabled: f.readOnly, placeholder: f.placeholder };
          let input;
          switch (f.type) {
            case 'textarea': input = <Textarea rows={f.rows || 4} {...common} />; break;
            case 'lines': input = <Textarea rows={f.rows || 4} {...common} placeholder={f.placeholder || 'One per line'} />; break;
            case 'select': input = <Select {...common} options={f.options} placeholder={f.required ? undefined : '—'} />; break;
            case 'number': input = <Input type="number" step="any" {...common} />; break;
            case 'date': input = <Input type="date" {...common} />; break;
            case 'datetime': input = <Input type="datetime-local" {...common} />; break;
            case 'checkbox':
              input = (
                <label className="flex h-[42px] items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!v[f.name]} onChange={(e) => set(f.name, e.target.checked)} className="h-4 w-4 accent-violet-500" /> {f.checkboxLabel || 'Yes'}
                </label>
              );
              break;
            case 'ref': case 'refs': input = <RefSelect field={f} value={v[f.name]} onChange={(val) => set(f.name, val)} />; break;
            case 'image': input = <ImageField value={v[f.name]} onChange={(val) => set(f.name, val)} />; break;
            case 'packages': input = <PackagesEditor value={v[f.name]} onChange={(val) => set(f.name, val)} />; break;
            case 'items': input = <ItemsEditor value={v[f.name]} onChange={(val) => set(f.name, val)} currency={v.currency} />; break;
            default: input = <Input type={f.type || 'text'} {...common} />;
          }
          return (
            <Field key={f.name} label={`${f.label}${f.required ? ' *' : ''}`} hint={f.hint} className={f.full || ['textarea', 'lines', 'items', 'refs', 'packages', 'image'].includes(f.type) ? 'sm:col-span-2' : ''}>
              {input}
            </Field>
          );
        })}
      </div>
      <ErrorBox>{state.error}</ErrorBox>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" loading={state.loading}>{submitLabel}</Button>
      </div>
    </form>
  );
}

/**
 * Config-driven CRUD page used by many admin modules.
 */
export default function Resource({
  endpoint, title, subtitle, columns, fields, filters = [], searchable = true, canCreate = true, canEdit = true, canDelete = true,
  rowActions, onRowClick, liveEvents, createLabel = 'New', defaultValues = {}, headerActions, params: extraParams = {}, emptyText,
}) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [filterVals, setFilterVals] = useState({});
  const [editing, setEditing] = useState(null); // null | {} (new) | row
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = { page, limit: 20, ...(debounced && { q: debounced }), ...filterVals, ...extraParams };
  const { data, loading, error, reload, refresh } = useFetch(endpoint, params);
  const rows = data?.items || [];
  // live: refresh quietly when the server announces a change (e.g. 'project:update')
  const liveKey = (liveEvents || []).join(',');
  useEffect(() => {
    if (!liveKey) return undefined;
    const s = getSocket();
    const h = () => refresh();
    liveKey.split(',').forEach((ev) => s.on(ev, h));
    return () => liveKey.split(',').forEach((ev) => s.off(ev, h));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey, endpoint, JSON.stringify(params)]);

  const save = async (body) => {
    if (editing?._id) await api.patch(`${endpoint}/${editing._id}`, body);
    else await api.post(endpoint, { ...defaultValues, ...body });
    setEditing(null);
    reload();
  };
  const remove = async (row) => {
    if (!window.confirm('Delete this item? This cannot be undone.')) return;
    try {
      await api.del(`${endpoint}/${row._id}`);
      reload();
    } catch (e) {
      alert(errMsg(e));
    }
  };

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle || (data ? `${data.total} total` : '')}
        actions={
          <>
            {headerActions}
            {canCreate && fields && <Button onClick={() => setEditing({})}><Plus className="h-4 w-4" /> {createLabel}</Button>}
          </>
        }
      />
      {(searchable || filters.length > 0) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {searchable && (
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input className="input pl-9" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          )}
          {filters.map((f) => (
            <Select key={f.name} className="sm:w-48" value={filterVals[f.name] || ''} onChange={(e) => { setFilterVals((s) => ({ ...s, [f.name]: e.target.value })); setPage(1); }} options={f.options} placeholder={f.label} />
          ))}
        </div>
      )}
      <ErrorBox>{error}</ErrorBox>
      <div className="card overflow-x-auto">
        {loading && !data ? (
          <div className="flex justify-center p-10"><Spinner /></div>
        ) : rows.length === 0 ? (
          <div className="p-6"><Empty title={`No ${title.toLowerCase()} found`} text={emptyText} /></div>
        ) : (
          <table className="table-x">
            <thead>
              <tr>
                {columns.map((c) => <th key={c.key || c.label}>{c.label}</th>)}
                {(canEdit || canDelete || rowActions) && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className={onRowClick ? 'cursor-pointer' : ''} onClick={() => onRowClick?.(row)}>
                  {columns.map((c) => <td key={c.key || c.label} className={c.className}>{c.render ? c.render(row) : getPath(row, c.key) ?? '—'}</td>)}
                  {(canEdit || canDelete || rowActions) && (
                    <td className="whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        {rowActions?.(row, reload)}
                        {canEdit && fields && <button className="rounded-lg p-1.5 text-slate-400 hover:bg-ink-700 hover:text-white" onClick={() => setEditing(row)} aria-label="Edit"><Pencil className="h-4 w-4" /></button>}
                        {canDelete && <button className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300" onClick={() => remove(row)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?._id ? `Edit ${title.replace(/s$/, '')}` : `${createLabel} ${title.replace(/s$/, '')}`} wide>
        {editing && <ResourceForm fields={fields} initial={editing._id ? editing : defaultValues} onSubmit={save} onCancel={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
