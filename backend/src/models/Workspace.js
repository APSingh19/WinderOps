import mongoose from 'mongoose';

const workspaceMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['Owner', 'Admin', 'Member', 'Viewer'], default: 'Member' },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const workspaceInviteSchema = new mongoose.Schema(
  {
    email: { type: String, lowercase: true, trim: true },
    role: { type: String, enum: ['Admin', 'Member', 'Viewer'], default: 'Member' },
    token: String,
    status: { type: String, enum: ['Pending', 'Accepted', 'Revoked'], default: 'Pending' },
    expiresAt: Date,
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, lowercase: true, trim: true, unique: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [workspaceMemberSchema],
    invites: [workspaceInviteSchema],
    settings: {
      visibility: { type: String, enum: ['Private', 'Organization'], default: 'Private' },
      defaultRole: { type: String, enum: ['Member', 'Viewer'], default: 'Member' },
      weekStartsOn: { type: Number, default: 1 },
      timezone: { type: String, default: 'UTC' }
    }
  },
  { timestamps: true }
);

workspaceSchema.index({ name: 'text', slug: 'text' });
workspaceSchema.index({ owner: 1 });

export default mongoose.model('Workspace', workspaceSchema);
