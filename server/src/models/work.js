import mongoose from 'mongoose';

const { Schema } = mongoose;

export const PROJECT_STATUSES = ['Not Started', 'In Progress', 'Review', 'Revision', 'Completed', 'On Hold'];

const milestoneSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  dueDate: Date,
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
  completedAt: Date,
});

const projectActivitySchema = new Schema(
  { text: String, by: { type: Schema.Types.ObjectId, ref: 'User' }, visibleToClient: { type: Boolean, default: true } },
  { timestamps: true }
);

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    service: String,
    status: { type: String, enum: PROJECT_STATUSES, default: 'Not Started' },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    startDate: Date,
    deadline: Date,
    manager: { type: Schema.Types.ObjectId, ref: 'User' },
    team: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    milestones: [milestoneSchema],
    activity: [projectActivitySchema],
    budget: Number,
  },
  { timestamps: true }
);
export const Project = mongoose.model('Project', projectSchema);

const commentSchema = new Schema(
  {
    text: { type: String, required: true },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    attachments: [{ type: Schema.Types.ObjectId, ref: 'File' }],
    internal: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const taskSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    milestone: Schema.Types.ObjectId,
    assignee: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['To Do', 'In Progress', 'Review', 'Done', 'Blocked'], default: 'To Do' },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    dueDate: Date,
    visibleToClient: { type: Boolean, default: false },
    comments: [commentSchema],
    attachments: [{ type: Schema.Types.ObjectId, ref: 'File' }],
    completedAt: Date,
  },
  { timestamps: true }
);
// Project progress follows its tasks (done ÷ total) — updated live whenever a task changes
const refreshProgress = (doc) => {
  if (doc?.project) import('../services/orderProject.js').then((m) => m.recomputeProgress(doc.project)).catch(() => {});
};
taskSchema.pre('save', function done(next) {
  if (this.isModified('status')) this.completedAt = this.status === 'Done' ? this.completedAt || new Date() : undefined;
  next();
});
taskSchema.post('save', refreshProgress);
taskSchema.post('findOneAndDelete', refreshProgress);
taskSchema.post('insertMany', (docs) => refreshProgress(docs?.[0]));
export const Task = mongoose.model('Task', taskSchema);

const folderSchema = new Schema(
  {
    name: { type: String, required: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
  },
  { timestamps: true }
);
export const Folder = mongoose.model('Folder', folderSchema);

const fileSchema = new Schema(
  {
    originalName: String,
    storedName: String,
    mimeType: String,
    size: Number,
    url: String,
    category: { type: String, enum: ['Requirements', 'Design Preview', 'Document', 'Deliverable', 'Media', 'Attachment', 'Other'], default: 'Other' },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    client: { type: Schema.Types.ObjectId, ref: 'Client' },
    folder: { type: Schema.Types.ObjectId, ref: 'Folder' },
    visibleToClient: { type: Boolean, default: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
export const File = mongoose.model('File', fileSchema);

// Client <-> Zeviro team messaging (portal)
const messageSchema = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fromClient: { type: Boolean, default: false },
    body: { type: String, required: true },
    attachments: [{ type: Schema.Types.ObjectId, ref: 'File' }],
    readByClient: { type: Boolean, default: false },
    readByTeam: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export const Message = mongoose.model('Message', messageSchema);

const ticketReplySchema = new Schema(
  {
    body: String,
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    fromClient: Boolean,
    attachments: [{ type: Schema.Types.ObjectId, ref: 'File' }],
  },
  { timestamps: true }
);

const ticketSchema = new Schema(
  {
    ticketNo: String,
    subject: { type: String, required: true },
    description: String,
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    category: { type: String, enum: ['Technical', 'Billing', 'Change Request', 'Bug', 'General'], default: 'General' },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    status: { type: String, enum: ['Open', 'In Progress', 'Waiting', 'Resolved', 'Closed'], default: 'Open' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assignee: { type: Schema.Types.ObjectId, ref: 'User' },
    replies: [ticketReplySchema],
  },
  { timestamps: true }
);
ticketSchema.pre('save', async function genNo(next) {
  if (!this.ticketNo) this.ticketNo = `TCK-${Date.now().toString(36).toUpperCase()}`;
  next();
});
export const Ticket = mongoose.model('Ticket', ticketSchema);
