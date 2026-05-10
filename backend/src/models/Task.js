import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    originalName: String,
    url: String,
    mimeType: String,
    size: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    from: String,
    to: String
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, maxlength: 3000 },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    delegatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: {
      type: String,
      enum: ['Todo', 'In Progress', 'Review', 'Completed'],
      default: 'Todo'
    },
    approvalStatus: {
      type: String,
      enum: ['Not Required', 'Pending', 'Approved', 'Rejected'],
      default: 'Not Required',
      index: true
    },
    reviewStatus: {
      type: String,
      enum: ['Not Started', 'In Review', 'Changes Requested', 'Accepted'],
      default: 'Not Started'
    },
    escalation: {
      level: { type: Number, default: 0 },
      reason: { type: String, maxlength: 300 },
      escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      escalatedAt: Date
    },
    dueDate: Date,
    position: { type: Number, default: 0 },
    labels: [{ type: String, trim: true }],
    attachments: [attachmentSchema],
    activity: [activitySchema]
  },
  { timestamps: true }
);

taskSchema.index({ title: 'text', description: 'text', labels: 'text' });
taskSchema.index({ project: 1, status: 1, assignee: 1, dueDate: 1 });
taskSchema.index({ assignee: 1, approvalStatus: 1, dueDate: 1 });
taskSchema.index({ reporter: 1, status: 1 });

export default mongoose.model('Task', taskSchema);
