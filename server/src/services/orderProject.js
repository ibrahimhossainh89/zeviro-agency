// Keeps a delivery project + its tasks in step with the order it came from.
// Paid order → project and task checklist are created automatically; every order status change
// (delivered, revision, completed, cancelled) moves the project, milestones, tasks and progress along with it.
import { Order, Project, Task } from '../models/index.js';
import { emit } from '../realtime.js';

const WORK_STATUSES = ['In Progress', 'Delivered', 'Revision Requested', 'Completed'];
const PROJECT_STATUS = { 'In Progress': 'In Progress', Delivered: 'Review', 'Revision Requested': 'Revision', Completed: 'Completed', Cancelled: 'On Hold' };

/** Default checklist for a new order: requirements → the package's features → QA → delivery. */
function checklist(order) {
  const due = order.dueDate;
  const features = (order.features || []).filter(Boolean).slice(0, 6);
  return [
    { title: 'Review requirements & confirm scope', key: 'start', priority: 'High', visibleToClient: true },
    ...(features.length ? features.map((f) => ({ title: f, key: 'work', visibleToClient: true })) : [{ title: `Work on ${order.packageTitle || order.packageName || order.serviceTitle}`, key: 'work', visibleToClient: true }]),
    { title: 'Quality check', key: 'qa', priority: 'High', visibleToClient: false },
    { title: 'Deliver to client', key: 'deliver', priority: 'High', visibleToClient: true, dueDate: due },
  ].map((t) => ({ ...t, dueDate: t.dueDate || due }));
}

export async function recomputeProgress(projectId) {
  const p = await Project.findById(projectId);
  if (!p) return;
  if (p.status === 'Completed') {
    if (p.progress !== 100) await Project.updateOne({ _id: p._id }, { progress: 100 });
    return;
  }
  const tasks = await Task.find({ project: p._id }).select('status').lean();
  if (!tasks.length) return;
  const done = tasks.filter((t) => t.status === 'Done').length;
  const progress = Math.round((done / tasks.length) * 100);
  if (progress !== p.progress) {
    await Project.updateOne({ _id: p._id }, { progress });
    emit('staff', 'project:update', { projectId: p._id });
    emit(`client:${p.client}`, 'project:update', { projectId: p._id });
  }
}

/** Create or update the project for this order. Safe to call any number of times. */
export async function syncOrderProject(orderOrId) {
  const order = typeof orderOrId === 'object' && orderOrId?._id ? orderOrId : await Order.findById(orderOrId);
  if (!order) return null;
  let project = order.project ? await Project.findById(order.project) : null;

  if (!project) {
    if (!WORK_STATUSES.includes(order.status)) return null; // nothing to deliver yet (not paid / cancelled)
    const now = new Date();
    project = await Project.create({
      name: `${order.serviceTitle} — ${order.number}`,
      description: order.requirements,
      client: order.client,
      service: order.serviceTitle,
      status: 'In Progress',
      startDate: order.paidAt || now,
      deadline: order.dueDate,
      manager: order.assignee,
      budget: order.price || undefined,
      milestones: [
        { title: 'Requirements confirmed', status: 'Completed', completedAt: now },
        { title: 'Work in progress', status: 'In Progress', dueDate: order.dueDate },
        { title: 'Delivery & review', status: 'Pending', dueDate: order.dueDate },
      ],
      activity: [{ text: `Project created automatically from order ${order.number}`, visibleToClient: true }],
    });
    const list = checklist(order);
    await Task.insertMany(list.map((t, i) => ({
      title: t.title,
      project: project._id,
      assignee: order.assignee,
      priority: t.priority || 'Medium',
      dueDate: t.dueDate,
      visibleToClient: t.visibleToClient,
      status: i === 0 ? 'Done' : i === 1 ? 'In Progress' : 'To Do',
      completedAt: i === 0 ? now : undefined,
      description: `Auto-created from order ${order.number}`,
    })));
    await Order.updateOne({ _id: order._id }, { project: project._id }); // updateOne: no save hooks → no loop
    order.project = project._id;
  }

  // ---- keep the project in step with the order ----
  const status = PROJECT_STATUS[order.status];
  const tasks = await Task.find({ project: project._id });
  const now = new Date();
  const setTask = async (pred, st) => {
    for (const t of tasks.filter(pred)) {
      if (t.status === st) continue;
      t.status = st;
      t.completedAt = st === 'Done' ? now : undefined;
      await t.save();
    }
  };
  const isDeliver = (t) => /^deliver to client/i.test(t.title);
  const isRevision = (t) => /^revision/i.test(t.title);
  const ms = (i, st) => {
    const m = project.milestones?.[i];
    if (m && m.status !== st) {
      m.status = st;
      m.completedAt = st === 'Completed' ? now : undefined;
    }
  };

  if (order.status === 'Delivered') {
    await setTask(() => true, 'Done');
    ms(1, 'Completed');
    ms(2, 'In Progress');
  } else if (order.status === 'Revision Requested') {
    const note = [...(order.timeline || [])].reverse().find((x) => x.status === 'Revision Requested')?.note;
    const open = tasks.find((t) => isRevision(t) && t.status !== 'Done');
    if (!open) {
      const n = tasks.filter(isRevision).length + 1;
      await Task.create({ title: `Revision ${n}${note ? `: ${note.slice(0, 80)}` : ''}`, description: note, project: project._id, assignee: order.assignee, priority: 'High', status: 'In Progress', visibleToClient: true, dueDate: new Date(Date.now() + 2 * 864e5) });
    }
    await setTask(isDeliver, 'To Do');
    ms(1, 'In Progress');
    ms(2, 'Pending');
  } else if (order.status === 'Completed') {
    await setTask(() => true, 'Done');
    ms(0, 'Completed');
    ms(1, 'Completed');
    ms(2, 'Completed');
  }

  if (status && project.status !== status) {
    project.status = status;
    project.activity.push({ text: `Order ${order.number}: ${order.status}`, visibleToClient: true });
  }
  if (order.dueDate && String(project.deadline) !== String(order.dueDate)) project.deadline = order.dueDate;
  if (order.assignee && !project.manager) project.manager = order.assignee;
  if (order.status === 'Completed') project.progress = 100;
  await project.save();
  await recomputeProgress(project._id);
  emit('staff', 'project:update', { projectId: project._id });
  emit(`client:${order.client}`, 'project:update', { projectId: project._id });
  return project;
}

/** One-off catch-up at start-up: paid orders that have no project yet get one (with tasks). */
export async function backfillOrderProjects() {
  const orders = await Order.find({ status: { $in: WORK_STATUSES }, $or: [{ project: null }, { project: { $exists: false } }] }).limit(500);
  let n = 0;
  for (const o of orders) {
    try {
      if (await syncOrderProject(o)) n++;
    } catch (e) {
      console.error('[projects] backfill', o.number, e.message);
    }
  }
  if (n) console.log(`[projects] created ${n} project(s) for paid orders`);
}
