import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { http, errMsg, api } from '../api/http';
import { Avatar, ErrorBox } from './ui';
import { useAuth } from '../context/AuthContext';
import { reconnectSocket } from '../lib/realtime';

/** Profile photo uploader: shows current photo (or coloured initials) with upload / remove actions. */
export default function AvatarUploader() {
  const { user, setUser } = useAuth();
  const input = useRef();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return setError('Image must be 2 MB or smaller');
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await http.post('/auth/me/avatar', fd);
      setUser(data.user);
      reconnectSocket(); // so typing indicators use the new photo
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      const d = await api.del('/auth/me/avatar');
      setUser(d.user);
      reconnectSocket();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-5">
      <button type="button" onClick={() => input.current?.click()} className="group relative rounded-full" aria-label="Change profile photo" disabled={busy}>
        <Avatar name={user?.name} src={user?.avatar} seed={user?._id} size="xl" />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition group-hover:opacity-100">
          <Camera className="h-6 w-6 text-snow" />
        </span>
      </button>
      <div className="space-y-2">
        <p className="text-sm text-slate-400">Your photo appears in chats, messages and typing indicators.<br />JPG, PNG, WEBP or GIF · max 2 MB. Without a photo we show your initials.</p>
        <div className="flex gap-2">
          <button type="button" className="btn-primary btn-sm" onClick={() => input.current?.click()} disabled={busy}>
            <Camera className="h-3.5 w-3.5" /> {busy ? 'Uploading…' : user?.avatar ? 'Change photo' : 'Upload photo'}
          </button>
          {user?.avatar && (
            <button type="button" className="btn-ghost btn-sm" onClick={remove} disabled={busy}>
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>
        <ErrorBox>{error}</ErrorBox>
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
    </div>
  );
}
