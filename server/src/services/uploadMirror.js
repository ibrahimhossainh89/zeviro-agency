// Keeps a copy of every uploaded file inside MongoDB (GridFS) so uploads survive on hosts whose disk is
// wiped on every restart (Render / Railway free tiers, Heroku…). Turn on with UPLOADS_IN_DB=true.
//
//   • every upload is still written to ./uploads as usual (nothing else in the app changes)
//   • right after it is written, a copy is stored in GridFS under the same relative path
//   • on start-up, files that exist in GridFS but not on disk are written back to ./uploads
//   • deleting an upload removes both copies
// On a normal server / VPS with a real disk, leave UPLOADS_IN_DB unset — nothing is copied.
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import multer from 'multer';

const ROOT = path.resolve('uploads');
const enabled = () => String(process.env.UPLOADS_IN_DB || '').toLowerCase() === 'true';
const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');
let bucket = null;
function getBucket() {
  if (!mongoose.connection?.db) return null;
  if (!bucket) bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
  return bucket;
}

async function deleteByName(name) {
  const b = getBucket();
  if (!b) return;
  const old = await b.find({ filename: name }).toArray();
  await Promise.all(old.map((f) => b.delete(f._id).catch(() => {})));
}

/** Copy one file from ./uploads into GridFS. */
export async function mirrorFile(absPath) {
  if (!enabled()) return;
  const b = getBucket();
  if (!b || !absPath) return;
  const name = rel(absPath);
  await deleteByName(name);
  await new Promise((resolve, reject) => {
    fs.createReadStream(absPath).pipe(b.openUploadStream(name)).on('finish', resolve).on('error', reject);
  });
}

/** Delete an upload from disk and from GridFS. */
export async function removeUpload(absPath) {
  await fs.promises.unlink(absPath).catch(() => {});
  if (enabled()) await deleteByName(rel(absPath)).catch(() => {});
}

/** multer.diskStorage that also mirrors each saved file into GridFS. */
export function mirrorDiskStorage(opts) {
  const disk = multer.diskStorage(opts);
  return {
    _handleFile(req, file, cb) {
      disk._handleFile(req, file, (err, info) => {
        if (err) return cb(err);
        mirrorFile(info.path)
          .catch((e) => console.error('[uploads] mirror failed', e.message))
          .finally(() => cb(null, info));
      });
    },
    _removeFile(req, file, cb) {
      disk._removeFile(req, file, cb);
      if (enabled() && file.path) deleteByName(rel(file.path)).catch(() => {});
    },
  };
}

/** Start-up: write back every file that is in GridFS but missing on disk. */
export async function restoreUploads() {
  if (!enabled()) return;
  const b = getBucket();
  if (!b) return;
  let n = 0;
  for await (const f of b.find({})) {
    const target = path.join(ROOT, f.filename);
    if (!target.startsWith(ROOT) || fs.existsSync(target)) continue;
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await new Promise((resolve, reject) => {
      b.openDownloadStream(f._id).pipe(fs.createWriteStream(target)).on('finish', resolve).on('error', reject);
    });
    n++;
  }
  console.log(`[uploads] stored in MongoDB${n ? ` · restored ${n} file(s) to disk` : ''}`);
}
