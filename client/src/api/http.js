import axios from 'axios';
import { PORTAL } from '../lib/portal';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  timeout: 30000,
  headers: { 'X-Zeviro-Portal': PORTAL },
});

export const errMsg = (e) => {
  const d = e?.response?.data;
  if (d?.details?.length) return d.details.map((x) => x.message).join(' · ');
  return d?.message || e?.message || 'Something went wrong';
};

// Tiny convenience wrappers returning `data`
export const api = {
  get: (url, params) => http.get(url, { params }).then((r) => r.data),
  post: (url, body) => http.post(url, body).then((r) => r.data),
  patch: (url, body) => http.patch(url, body).then((r) => r.data),
  put: (url, body) => http.put(url, body).then((r) => r.data),
  del: (url) => http.delete(url).then((r) => r.data),
  upload: (url, files, fields = {}) => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append('files', f));
    Object.entries(fields).forEach(([k, v]) => v !== undefined && v !== '' && fd.append(k, v));
    return http.post(url, fd).then((r) => r.data);
  },
};
