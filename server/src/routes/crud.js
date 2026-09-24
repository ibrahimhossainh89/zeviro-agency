import { Router } from 'express';
import { asyncHandler, AppError, paginate, escapeRegex } from '../utils/http.js';
import { audit } from '../middleware/common.js';

/**
 * Generic REST resource: GET / (search, filter, sort, paginate), GET /:id, POST /, PATCH /:id, DELETE /:id
 * options:
 *  - populate: string | array for mongoose populate
 *  - search: fields for ?q= search
 *  - filters: fields allowed as exact-match query params
 *  - scope(req): extra mongo filter (e.g. project-level access)
 *  - sort: default sort
 *  - writable: whitelist of fields accepted on create/update (default: all except _id)
 *  - hooks: { beforeCreate(req, data), afterCreate(req, doc), afterUpdate(req, doc, before) }
 *  - entity: name for audit logs
 */
export function crudRouter(Model, opts = {}) {
  const r = Router();
  const {
    populate,
    search = [],
    filters = [],
    scope = () => ({}),
    sort = '-createdAt',
    writable,
    hooks = {},
    entity = Model.modelName,
    readOnly = false,
  } = opts;

  // only populate when this resource has relations (populate('') throws on newer Mongoose)
  const withPop = (query) => (populate ? query.populate(populate) : query);

  const pick = (body) => {
    const data = { ...body };
    delete data._id;
    delete data.createdAt;
    delete data.updatedAt;
    if (!writable) return data;
    return Object.fromEntries(Object.entries(data).filter(([k]) => writable.includes(k)));
  };

  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const { page, limit, skip } = paginate(req);
      const q = { ...(await scope(req)) };
      for (const f of filters) if (req.query[f] !== undefined && req.query[f] !== '') q[f] = req.query[f];
      if (req.query.q && search.length) {
        const rx = new RegExp(escapeRegex(req.query.q), 'i');
        const or = search.map((f) => ({ [f]: rx }));
        if (q.$or) {
          q.$and = [{ $or: q.$or }, { $or: or }];
          delete q.$or;
        } else q.$or = or;
      }
      const [items, total] = await Promise.all([
        withPop(Model.find(q).sort(req.query.sort || sort).skip(skip).limit(limit)),
        Model.countDocuments(q),
      ]);
      res.json({ items, total, page, pages: Math.ceil(total / limit) });
    })
  );

  r.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const doc = await withPop(Model.findOne({ _id: req.params.id, ...(await scope(req)) }));
      if (!doc) throw new AppError(404, `${entity} not found`);
      res.json(doc);
    })
  );

  if (readOnly) return r;

  r.post(
    '/',
    asyncHandler(async (req, res) => {
      let data = pick(req.body);
      if (hooks.beforeCreate) data = (await hooks.beforeCreate(req, data)) || data;
      const doc = await Model.create(data);
      await audit(req, 'create', entity, doc._id);
      if (hooks.afterCreate) await hooks.afterCreate(req, doc);
      res.status(201).json(doc);
    })
  );

  r.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const doc = await Model.findOne({ _id: req.params.id, ...(await scope(req)) });
      if (!doc) throw new AppError(404, `${entity} not found`);
      const before = doc.toObject();
      doc.set(pick(req.body));
      await doc.save();
      await audit(req, 'update', entity, doc._id, { fields: Object.keys(req.body) });
      if (hooks.afterUpdate) await hooks.afterUpdate(req, doc, before);
      res.json(populate ? await doc.populate(populate) : doc);
    })
  );

  r.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const doc = await Model.findOneAndDelete({ _id: req.params.id, ...(await scope(req)) });
      if (!doc) throw new AppError(404, `${entity} not found`);
      await audit(req, 'delete', entity, doc._id);
      res.json({ ok: true });
    })
  );

  return r;
}
