import { useState } from 'react';
import { Upload, Download, Copy } from 'lucide-react';
import Resource from '../../components/Resource';
import { Badge, Select, ErrorBox, SuccessBox } from '../../components/ui';
import { api, errMsg } from '../../api/http';
import { fmtDate, fmtSize, useFetch } from '../../lib/utils';

const CATS = ['Requirements', 'Design Preview', 'Document', 'Deliverable', 'Media', 'Attachment', 'Other'];

export default function Media() {
  const projects = useFetch('/projects', { limit: 200 });
  const [opts, setOpts] = useState({ project: '', category: 'Media', visibleToClient: 'true' });
  const [msg, setMsg] = useState({ ok: '', err: '' });
  const [v, setV] = useState(0);

  const upload = async (files) => {
    setMsg({ ok: '', err: '' });
    try {
      const r = await api.upload('/files', files, opts);
      setMsg({ ok: `${r.length} file(s) uploaded`, err: '' });
      setV((x) => x + 1);
    } catch (e) {
      setMsg({ ok: '', err: errMsg(e) });
    }
  };

  return (
    <div>
      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="w-56"><p className="label">Project</p><Select value={opts.project} onChange={(e) => setOpts({ ...opts, project: e.target.value })} options={(projects.data?.items || []).map((p) => ({ value: p._id, label: p.name }))} placeholder="General media library" /></div>
        <div className="w-44"><p className="label">Category</p><Select value={opts.category} onChange={(e) => setOpts({ ...opts, category: e.target.value })} options={CATS} /></div>
        <div className="w-44"><p className="label">Visibility</p><Select value={opts.visibleToClient} onChange={(e) => setOpts({ ...opts, visibleToClient: e.target.value })} options={[{ value: 'true', label: 'Visible to client' }, { value: 'false', label: 'Internal only' }]} /></div>
        <label className="btn-primary cursor-pointer"><Upload className="h-4 w-4" /> Upload files<input type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} /></label>
        <p className="w-full text-xs text-slate-500">Allowed: images, PDF, Office docs, CSV, TXT, ZIP · max 15 MB each, 5 per upload.</p>
        <div className="w-full"><ErrorBox>{msg.err}</ErrorBox><SuccessBox>{msg.ok}</SuccessBox></div>
      </div>
      <Resource
        key={v}
        endpoint="/files"
        title="Media & Files"
        canCreate={false}
        fields={[{ name: 'originalName', label: 'File name', required: true }, { name: 'category', label: 'Category', type: 'select', options: CATS }, { name: 'visibleToClient', label: 'Visibility', type: 'checkbox', checkboxLabel: 'Visible to client' }]}
        filters={[{ name: 'category', label: 'All categories', options: CATS }]}
        rowActions={(r) => (
          <>
            <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${r.url}`)} className="rounded-lg p-1.5 text-slate-400 hover:bg-ink-700 hover:text-white" aria-label="Copy link"><Copy className="h-4 w-4" /></button>
            <a href={r.url} className="rounded-lg p-1.5 text-slate-400 hover:bg-ink-700 hover:text-white" aria-label="Download"><Download className="h-4 w-4" /></a>
          </>
        )}
        columns={[
          { label: 'File', render: (r) => <><p className="max-w-xs truncate font-medium text-white">{r.originalName}</p><p className="text-xs text-slate-500">{r.mimeType}</p></> },
          { label: 'Size', render: (r) => fmtSize(r.size) },
          { label: 'Category', render: (r) => <Badge tone="violet">{r.category}</Badge> },
          { label: 'Project', render: (r) => r.project?.name || '—' },
          { label: 'Client access', render: (r) => (r.visibleToClient ? <Badge tone="green">Visible</Badge> : <Badge>Internal</Badge>) },
          { label: 'Uploaded', render: (r) => <span className="text-xs text-slate-500">{fmtDate(r.createdAt)} · {r.uploadedBy?.name}</span> },
        ]}
      />
    </div>
  );
}
