import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    teamName: { type: String, trim: true, maxlength: 100 },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    teamLead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true },
    assignedProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    permissions: {
      canCreateProjects: { type: Boolean, default: true },
      canManageMembers: { type: Boolean, default: false },
      canManageBilling: { type: Boolean, default: false }
    },
    active: { type: Boolean, default: true, index: true },
    archivedAt: Date,
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

teamSchema.pre('validate', function syncTeamAliases(next) {
  this.teamName = this.teamName || this.name;
  this.name = this.name || this.teamName;
  this.teamLead = this.teamLead || this.lead;
  this.lead = this.lead || this.teamLead;
  next();
});

teamSchema.index({ workspace: 1, name: 1 }, { unique: true });
teamSchema.index({ department: 1, lead: 1 });

export default mongoose.model('Team', teamSchema);
