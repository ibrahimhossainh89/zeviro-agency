// Staff: moderate client reviews.
//   pending → Publish (shown on the service page)   |   Reject → Trash
//   published → Edit (super admin) / Remove → Trash
//   Trash → Restore, or Delete forever (super admin). Trash is emptied automatically after 30 days.
import { Router } from 'express';
import { z } from 'zod';
import { Review } from '../models/index.js';
import { asyncHandler, AppError, paginate } from '../utils/http.js';
import { audit, validate } from '../middleware/common.js';
import { emit, emitAll } from '../realtime.js';

const r = Router();
export const TRASH_DAYS = 30;

const superOnly = (req, _res, next) => (req.user?.role === 'superadmin' ? next() : next(new AppError(403, 'Only the super admin can do this')));
const changed = (rv, wasPublished) => {
  emit('review-staff', 'review:update', { id: rv._id });
  if (wasPublished || rv.status === 'published') emitAll('site:update', { type: 'reviews' }); // service pages update live
};
const load = async (id) => {
  const rv = await Review.findById(id);
  if (!rv) throw new AppError(404, 'Review not found');
  return rv;
};

r.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req);
    const q = req.query.status ? { status: req.query.status } : { status: { $ne: 'trashed' } };
    const [items, total, pending, published, trashed] = await Promise.all([
      Review.find(q).sort(req.query.status === 'trashed' ? { trashedAt: -1 } : { status: 1, createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name email avatar').populate('client', 'name').populate('order', 'number').populate('editedBy', 'name'),
      Review.countDocuments(q),
      Review.countDocuments({ status: 'pending' }),
      Review.countDocuments({ status: 'published' }),
      Review.countDocuments({ status: 'trashed' }),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) || 1, pending, published, trashed, trashDays: TRASH_DAYS });
  })
);

// Super admin: change the stars / text that are shown publicly (the client keeps seeing their original)
r.patch(
  '/:id',
  superOnly,
  validate(
    z.object({
      communication: z.number().int().min(1).max(5),
      satisfaction: z.number().int().min(1).max(5),
      value: z.number().int().min(1).max(5),
      body: z.string().trim().min(2).max(2000),
    })
  ),
  asyncHandler(async (req, res) => {
    const rv = await load(req.params.id);
    if (!rv.original?.body) rv.original = { ratings: { ...rv.ratings.toObject?.() ?? rv.ratings }, body: rv.body }; // older reviews
    rv.ratings = { communication: req.body.communication, satisfaction: req.body.satisfaction, value: req.body.value };
    rv.body = req.body.body;
    rv.editedAt = new Date();
    rv.editedBy = req.user._id;
    await rv.save();
    await audit(req, 'review_edit', 'Review', rv._id);
    changed(rv);
    res.json(rv);
  })
);

r.post(
  '/:id/publish',
  asyncHandler(async (req, res) => {
    const rv = await load(req.params.id);
    rv.status = 'published';
    rv.publishedAt = rv.publishedAt || new Date();
    rv.trashedAt = undefined;
    rv.moderatedBy = req.user._id;
    await rv.save();
    await audit(req, 'review_publish', 'Review', rv._id);
    changed(rv);
    res.json(rv);
  })
);

// Reject (pending) or Remove (published) → Trash. The client is never told.
r.post(
  '/:id/trash',
  asyncHandler(async (req, res) => {
    const rv = await load(req.params.id);
    if (rv.status === 'trashed') return res.json(rv);
    const wasPublished = rv.status === 'published';
    rv.previousStatus = rv.status;
    rv.status = 'trashed';
    rv.trashedAt = new Date();
    rv.moderatedBy = req.user._id;
    await rv.save();
    await audit(req, wasPublished ? 'review_remove' : 'review_reject', 'Review', rv._id);
    changed(rv, wasPublished);
    res.json(rv);
  })
);

r.post(
  '/:id/restore',
  asyncHandler(async (req, res) => {
    const rv = await load(req.params.id);
    if (rv.status !== 'trashed') throw new AppError(409, 'This review is not in the trash');
    rv.status = rv.previousStatus === 'published' ? 'published' : 'pending';
    rv.trashedAt = undefined;
    await rv.save();
    await audit(req, 'review_restore', 'Review', rv._id);
    changed(rv);
    res.json(rv);
  })
);

// Delete forever (super admin, only from the trash)
r.delete(
  '/:id',
  superOnly,
  asyncHandler(async (req, res) => {
    const rv = await load(req.params.id);
    if (rv.status !== 'trashed') throw new AppError(409, 'Move the review to the trash first');
    await rv.deleteOne();
    await audit(req, 'review_delete', 'Review', rv._id);
    emit('review-staff', 'review:update', { id: rv._id });
    res.json({ ok: true });
  })
);

/** Background job: permanently delete reviews that have been in the trash for 30 days. */
export async function emptyReviewTrash() {
  const r2 = await Review.deleteMany({ status: 'trashed', trashedAt: { $lt: new Date(Date.now() - TRASH_DAYS * 864e5) } });
  if (r2.deletedCount) emit('review-staff', 'review:update', {});
}

export default r;
